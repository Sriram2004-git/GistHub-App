from typing import TYPE_CHECKING
from sqlmodel import Field, Relationship, SQLModel, UniqueConstraint

if TYPE_CHECKING:
    from app.models.gist import Gist
    from app.models.user import User


class GistShare(SQLModel, table=True):
    __tablename__ = "gist_shares"
    __table_args__ = (
        UniqueConstraint("gist_id", "recipient_id", name="uq_gist_shares_gist_recipient"),
    )

    id: int | None = Field(default=None, primary_key=True)
    gist_id: int = Field(foreign_key="gists.id")
    recipient_id: int = Field(foreign_key="users.id")

    gist: "Gist" = Relationship(back_populates="shares")
    recipient: "User" = Relationship(back_populates="received_shares")
