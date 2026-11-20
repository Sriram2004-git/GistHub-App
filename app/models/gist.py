from sqlmodel import Field, Relationship, SQLModel

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.gist_share import GistShare


class Gist(SQLModel, table=True):
    __tablename__ = "gists"

    id: int | None = Field(default=None, primary_key=True)
    title: str
    content: str
    owner_id: int = Field(foreign_key="users.id")

    owner: "User" = Relationship(back_populates="owned_gists")
    shares: list["GistShare"] = Relationship(back_populates="gist")
