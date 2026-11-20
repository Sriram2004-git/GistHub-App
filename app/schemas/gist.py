from pydantic import BaseModel, ConfigDict


class GistCreate(BaseModel):
    title: str
    content: str


class GistUpdate(BaseModel):
    title: str | None = None
    content: str | None = None


class GistRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    content: str
    owner_id: int


class GistShareCreate(BaseModel):
    recipient_id: int


class GistShareRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    gist_id: int
    recipient_id: int
