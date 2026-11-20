from sqlmodel import Field, Relationship, SQLModel

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.gist import Gist
    from app.models.gist_share import GistShare


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: int | None = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    password_hash: str

    owned_gists: list["Gist"] = Relationship(back_populates="owner")
    received_shares: list["GistShare"] = Relationship(back_populates="recipient")
