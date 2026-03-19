from workers.common.logger import get_logger
from workers.learn.sync_learn_cards import sync_learn_cards

logger = get_logger('generate_top3')


if __name__ == '__main__':
    result = sync_learn_cards()
    logger.info('generate_top3 finished: %s', result)

