from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from workers.common.logger import get_logger  # noqa: E402
from workers.learn.sync_learn_cards import sync_learn_cards  # noqa: E402

logger = get_logger('generate_top3')


if __name__ == '__main__':
    result = sync_learn_cards()
    logger.info('generate_top3 finished: %s', result)
