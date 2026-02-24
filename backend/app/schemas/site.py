from typing import Optional, List, Any, Union
from uuid import UUID
from pydantic import BaseModel

class Basin(BaseModel):
    id: Union[str, UUID]
    code: int
    name: str
    level: int
    parent_basin_id: Optional[Union[str, UUID]] = None
    geometry: Optional[Any] = None
    color: Optional[str] = None

class Station(BaseModel):
    id: Union[str, UUID]
    code: str
    name: str
    basin_id: Optional[Union[str, UUID]] = None
    lat: float
    lon: float
    type: str
    active: bool
