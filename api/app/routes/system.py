from fastapi import APIRouter

router = APIRouter(prefix='/v1/system', tags=['system'])


@router.get('/health')
def health():
    return {'ok': True, 'message': 'ok', 'data': {'service': 'api'}, 'meta': {}}
