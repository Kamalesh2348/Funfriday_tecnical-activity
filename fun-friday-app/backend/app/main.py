from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional
import os
import secrets
import shutil
import time

from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    UploadFile,
    File,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from sqlalchemy import (
    create_engine,
    String,
    Integer,
    Boolean,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    select,
)
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    mapped_column,
    sessionmaker,
    Session,
)
from passlib.context import CryptContext
from openpyxl import load_workbook


# ============================================================
# CONFIGURATION
# ============================================================

BASE = Path(__file__).resolve().parent.parent
UPLOADS = BASE / "uploads" / "questions"
UPLOADS.mkdir(parents=True, exist_ok=True)

DB_URL = os.getenv(
    "DATABASE_URL",
    f"sqlite:///{BASE / 'funfriday.db'}",
)

engine = create_engine(
    DB_URL,
    connect_args=(
        {"check_same_thread": False}
        if DB_URL.startswith("sqlite")
        else {}
    ),
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    expire_on_commit=False,
)

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Demo/local token store.
# Use a secure session/JWT implementation for production.
TOKENS: dict[str, int] = {}
PRESENCE: dict[int, float] = {}

MAX_IMAGE_BYTES = 5 * 1024 * 1024


# ============================================================
# DATABASE MODELS
# ============================================================

class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(
        String(80), unique=True, index=True
    )
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), default="user")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Team(Base):
    __tablename__ = "teams"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )


class Membership(Base):
    __tablename__ = "memberships"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), unique=True
    )
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"))


class Activity(Base):
    __tablename__ = "activities"

    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(String(40), unique=True)
    name: Mapped[str] = mapped_column(String(100))
    duration_seconds: Mapped[int] = mapped_column(
        Integer, default=60
    )
    unlocked: Mapped[bool] = mapped_column(Boolean, default=False)
    published: Mapped[bool] = mapped_column(Boolean, default=False)


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(primary_key=True)
    number: Mapped[int] = mapped_column(Integer)
    answer: Mapped[str] = mapped_column(String(250))
    hint: Mapped[Optional[str]] = mapped_column(
        String(250), nullable=True
    )
    status: Mapped[str] = mapped_column(String(20), default="locked")
    started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )
    ends_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )
    resolved: Mapped[bool] = mapped_column(Boolean, default=False)


class QImage(Base):
    __tablename__ = "question_images"

    id: Mapped[int] = mapped_column(primary_key=True)
    question_id: Mapped[int] = mapped_column(
        ForeignKey("questions.id")
    )
    path: Mapped[str] = mapped_column(String(500))
    order_num: Mapped[int] = mapped_column(Integer, default=0)


class Submission(Base):
    __tablename__ = "submissions"

    id: Mapped[int] = mapped_column(primary_key=True)
    question_id: Mapped[int] = mapped_column(
        ForeignKey("questions.id")
    )
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    answer_text: Mapped[str] = mapped_column(String(500))
    status: Mapped[str] = mapped_column(String(20), default="pending")
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )
    points: Mapped[int] = mapped_column(Integer, default=0)


class Topic(Base):
    __tablename__ = "topics"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    text: Mapped[str] = mapped_column(String(250))
    status: Mapped[str] = mapped_column(String(20), default="locked")
    started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )
    ends_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )
    resolved: Mapped[bool] = mapped_column(Boolean, default=False)


class Buzzer(Base):
    __tablename__ = "buzzer_entries"
    __table_args__ = (
        UniqueConstraint(
            "round_key",
            "team_id",
            name="uq_round_team_buzzer",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    round_key: Mapped[str] = mapped_column(String(100), index=True)
    activity_key: Mapped[str] = mapped_column(String(40))
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    pressed_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )
    position: Mapped[int] = mapped_column(Integer)


class Score(Base):
    __tablename__ = "scores"

    id: Mapped[int] = mapped_column(primary_key=True)
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"))
    activity_key: Mapped[str] = mapped_column(String(40))
    round_key: Mapped[str] = mapped_column(String(100))
    points: Mapped[int] = mapped_column(Integer, default=0)
    updated_by: Mapped[int] = mapped_column(ForeignKey("users.id"))


class ImportedResult(Base):
    __tablename__ = "imported_results"

    id: Mapped[int] = mapped_column(primary_key=True)
    team_name: Mapped[str] = mapped_column(
        String(100), unique=True
    )
    object_score: Mapped[int] = mapped_column(Integer, default=0)
    speech_score: Mapped[int] = mapped_column(Integer, default=0)
    total: Mapped[int] = mapped_column(Integer, default=0)


Base.metadata.create_all(engine)


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="Fun Friday Arena API",
    version="1.0.0",
)

app.mount(
    "/uploads",
    StaticFiles(directory=str(BASE / "uploads")),
    name="uploads",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

bearer = HTTPBearer(auto_error=False)


# ============================================================
# DATABASE AND AUTHENTICATION HELPERS
# ============================================================

def db_dep():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def now():
    return datetime.utcnow()


def is_online(uid: int):
    return time.time() - PRESENCE.get(uid, 0) < 35


def user_dict(u: User, db: Session):
    membership = db.scalar(
        select(Membership).where(Membership.user_id == u.id)
    )
    team = db.get(Team, membership.team_id) if membership else None

    return {
        "id": u.id,
        "username": u.username,
        "role": u.role,
        "online": is_online(u.id),
        "team_id": team.id if team else None,
        "team_name": team.name if team else None,
    }


def current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(db_dep),
):
    if not creds or creds.credentials not in TOKENS:
        raise HTTPException(
            status_code=401,
            detail="Please log in",
        )

    user = db.get(User, TOKENS[creds.credentials])

    if not user or not user.is_active:
        raise HTTPException(
            status_code=401,
            detail="Account unavailable",
        )

    PRESENCE[user.id] = time.time()
    return user


def admin(u: User = Depends(current_user)):
    if u.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required",
        )
    return u


def team_for(db: Session, uid: int):
    membership = db.scalar(
        select(Membership).where(Membership.user_id == uid)
    )
    return db.get(Team, membership.team_id) if membership else None


def active_round(db: Session, key: str):
    if key.startswith("object:"):
        question = db.get(Question, int(key.split(":")[1]))
        return question, "find-object"

    if key.startswith("speech:"):
        topic = db.get(Topic, int(key.split(":")[1]))
        return topic, "lightning-speech"

    return None, None


def round_open(round_item):
    if (
        not round_item
        or round_item.status != "active"
        or round_item.resolved
    ):
        return False

    if round_item.ends_at and now() >= round_item.ends_at:
        round_item.status = "closed"
        return False

    return True


# ============================================================
# REQUEST SCHEMAS
# ============================================================

class LoginIn(BaseModel):
    username: str
    password: str


class TimerIn(BaseModel):
    duration_seconds: int = Field(ge=10, le=3600)


class TeamGenerateIn(BaseModel):
    user_ids: list[int]
    include_online: bool = True
    include_offline: bool = True


class RenameIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class QuestionIn(BaseModel):
    number: int = Field(ge=1)
    answer: str = Field(min_length=1, max_length=250)
    hint: Optional[str] = None


class AnswerIn(BaseModel):
    answer_text: str = Field(min_length=1, max_length=500)


class EvaluateIn(BaseModel):
    status: str
    points: int = Field(default=0, ge=0, le=10000)


class TopicIn(BaseModel):
    user_id: int
    text: str = Field(min_length=1, max_length=250)


class ScoreIn(BaseModel):
    team_id: int
    activity_key: str
    round_key: str
    points: int = Field(ge=0, le=10000)


class PublishIn(BaseModel):
    published: bool


class NewUserIn(BaseModel):
    username: str = Field(
        min_length=2,
        max_length=80,
        pattern=r"^[A-Za-z0-9_.-]+$",
    )
    password: str = Field(min_length=8, max_length=128)


# ============================================================
# STARTUP
# ============================================================

@app.on_event("startup")
def seed():
    with SessionLocal() as db:
        activities = [
            ("find-object", "Find the Object", 60),
            ("lightning-speech", "Lightning Speech", 120),
        ]

        for key, name, duration in activities:
            if not db.scalar(
                select(Activity).where(Activity.key == key)
            ):
                db.add(
                    Activity(
                        key=key,
                        name=name,
                        duration_seconds=duration,
                    )
                )

        if not db.scalar(
            select(User).where(User.username == "admin")
        ):
            admin_password = os.getenv(
                "ADMIN_PASSWORD",
                "Admin123!",
            )

            db.add(
                User(
                    username="admin",
                    password_hash=pwd.hash(admin_password),
                    role="admin",
                )
            )

            if os.getenv("SEED_DEMO_USERS", "true").lower() != "false":
                user_password = os.getenv(
                    "DEMO_USER_PASSWORD",
                    "User123!",
                )

                db.add_all(
                    [
                        User(
                            username=username,
                            password_hash=pwd.hash(user_password),
                        )
                        for username in (
                            "alice",
                            "bob",
                            "charlie",
                            "dina",
                        )
                    ]
                )

        db.commit()


# ============================================================
# HEALTH AND AUTHENTICATION
# ============================================================

@app.get("/api/health")
def health():
    return {"ok": True, "app": "Fun Friday Arena"}


@app.post("/api/auth/signup")
def signup(
    data: NewUserIn,
    db: Session = Depends(db_dep),
):
    name = data.username.strip()

    if db.scalar(select(User).where(User.username == name)):
        raise HTTPException(
            status_code=409,
            detail="Username already exists. Choose another username.",
        )

    user = User(
        username=name,
        password_hash=pwd.hash(data.password),
        role="user",
        is_active=True,
    )

    db.add(user)

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Username already exists. Choose another username.",
        )

    db.refresh(user)

    return {
        "ok": True,
        "message": "Account created. You can now log in.",
    }


@app.post("/api/auth/login")
def login(
    data: LoginIn,
    db: Session = Depends(db_dep),
):
    user = db.scalar(
        select(User).where(User.username == data.username)
    )

    if (
        not user
        or not user.is_active
        or not pwd.verify(data.password, user.password_hash)
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password",
        )

    token = secrets.token_urlsafe(32)
    TOKENS[token] = user.id
    PRESENCE[user.id] = time.time()

    return {
        "token": token,
        "user": user_dict(user, db),
    }


@app.post("/api/auth/logout")
def logout(
    u: User = Depends(current_user),
    creds: HTTPAuthorizationCredentials = Depends(bearer),
):
    TOKENS.pop(creds.credentials, None)
    PRESENCE.pop(u.id, None)

    return {"ok": True}


@app.get("/api/me")
def me(
    u: User = Depends(current_user),
    db: Session = Depends(db_dep),
):
    return user_dict(u, db)


@app.post("/api/heartbeat")
def heartbeat(u: User = Depends(current_user)):
    PRESENCE[u.id] = time.time()
    return {"ok": True}


# ============================================================
# USER MANAGEMENT
# ============================================================

@app.get("/api/users")
def users(
    admin_user: User = Depends(admin),
    db: Session = Depends(db_dep),
):
    """Return active users to the admin."""

    active_users = db.scalars(
        select(User)
        .where(User.is_active == True)
        .order_by(User.username)
    ).all()

    return [user_dict(user, db) for user in active_users]


@app.post("/api/users")
def create_user(
    data: NewUserIn,
    admin_user: User = Depends(admin),
    db: Session = Depends(db_dep),
):
    """Create a participant from the admin interface."""

    name = data.username.strip()

    if db.scalar(select(User).where(User.username == name)):
        raise HTTPException(
            status_code=409,
            detail="Username already exists",
        )

    user = User(
        username=name,
        password_hash=pwd.hash(data.password),
        role="user",
        is_active=True,
    )

    db.add(user)

    try:
        db.commit()
        db.refresh(user)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Could not create user. The username may already exist.",
        )

    return user_dict(user, db)


@app.delete("/api/users/{user_id}")
def delete_user(
    user_id: int,
    admin_user: User = Depends(admin),
    db: Session = Depends(db_dep),
):
    """
    Soft-delete a participant:
    - Mark the account inactive.
    - Remove team membership.
    - Invalidate existing login tokens.
    """

    target = db.get(User, user_id)

    if not target or not target.is_active:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    if target.role == "admin":
        raise HTTPException(
            status_code=403,
            detail="Cannot delete an admin account",
        )

    # Mark the account inactive instead of permanently deleting it.
    target.is_active = False

    # Remove the participant's team membership.
    db.query(Membership).filter(
        Membership.user_id == target.id
    ).delete(synchronize_session=False)

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not delete the participant",
        )

    # Invalidate the deleted user's existing tokens.
    tokens_to_remove = [
        token
        for token, uid in TOKENS.items()
        if uid == target.id
    ]

    for token in tokens_to_remove:
        TOKENS.pop(token, None)

    PRESENCE.pop(target.id, None)

    return {
        "ok": True,
        "message": f"User {target.username} deleted successfully",
        "user_id": target.id,
    }


# ============================================================
# TEAM MANAGEMENT
# ============================================================

@app.post("/api/teams/generate")
def generate_teams(
    data: TeamGenerateIn,
    admin_user: User = Depends(admin),
    db: Session = Depends(db_dep),
):
    chosen = []

    for uid in dict.fromkeys(data.user_ids):
        user = db.get(User, uid)

        if not user or not user.is_active or user.role != "user":
            continue

        online = is_online(uid)

        if (
            (online and data.include_online)
            or (not online and data.include_offline)
        ):
            chosen.append(user)

    if not chosen:
        raise HTTPException(
            status_code=400,
            detail="Select at least one eligible participant",
        )

    import random
    random.shuffle(chosen)

    db.query(Membership).delete()
    db.query(Team).delete()
    db.flush()

    if len(chosen) % 2 == 1:
        groups = (
            [chosen[i:i + 2] for i in range(0, len(chosen) - 3, 2)]
            + [chosen[-3:]]
        )
    else:
        groups = [
            chosen[i:i + 2]
            for i in range(0, len(chosen), 2)
        ]

    output = []

    for index, group in enumerate(groups, 1):
        team = Team(name=f"Team {index}")
        db.add(team)
        db.flush()

        for user in group:
            db.add(
                Membership(
                    team_id=team.id,
                    user_id=user.id,
                )
            )

        output.append(
            {
                "id": team.id,
                "name": team.name,
                "members": [user.username for user in group],
            }
        )

    db.commit()

    return {
        "teams": output,
        "count": len(chosen),
    }


@app.get("/api/teams")
def get_teams(
    u: User = Depends(current_user),
    db: Session = Depends(db_dep),
):
    result = []

    for team in db.scalars(
        select(Team).order_by(Team.id)
    ).all():
        members = []

        for membership in db.scalars(
            select(Membership).where(
                Membership.team_id == team.id
            )
        ).all():
            user = db.get(User, membership.user_id)

            if user and user.is_active:
                members.append(
                    {
                        "id": user.id,