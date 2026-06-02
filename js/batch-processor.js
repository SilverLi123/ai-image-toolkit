function createBatchController() {
  let isCancelled = false;

  return {
    cancel() {
      isCancelled = true;
    },
    get cancelled() {
      return isCancelled;
    },
  };
}

async function processBatch(items, options) {
  const {
    controller = createBatchController(),
    processItem,
    onItemStart,
    onItemDone,
    onItemError,
    onComplete,
  } = options;

  let succeeded = 0;
  let failed = 0;

  for (let index = 0; index < items.length; index++) {
    if (controller.cancelled) break;

    const item = items[index];
    if (onItemStart) onItemStart(item, index);

    try {
      const result = await processItem(item, index);
      if (controller.cancelled) break;
      succeeded++;
      if (onItemDone) onItemDone(item, result, index);
    } catch (error) {
      if (controller.cancelled) break;
      failed++;
      if (onItemError) onItemError(item, error, index);
    }
  }

  const summary = {
    total: items.length,
    succeeded,
    failed,
    cancelled: controller.cancelled,
  };

  if (onComplete) onComplete(summary);
  return summary;
}
