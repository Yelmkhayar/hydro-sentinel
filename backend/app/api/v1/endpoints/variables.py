from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from typing import List, Dict, Any

router = APIRouter()

@router.get("/variables")
async def get_variables(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """
    Get list of available variables from api.v_ref_variable view.
    Returns variable code, name, and unit.
    """
    query = text("""
        SELECT 
            variable_code as code,
            variable_label as name,
            variable_unit as unit
        FROM api.v_ref_variable
        ORDER BY variable_label
    """)
    
    result = await db.execute(query)
    rows = result.fetchall()
    
    return [
        {
            "code": row.code,
            "label": row.name,
            "unit": row.unit
        }
        for row in rows
    ]
