/**
 * Shared drag-and-drop reordering for batch lists.
 *
 * Usage:
 *   enableDragSort(listElement, (oldIdx, newIdx) => { ... });
 *
 * @param {HTMLUListElement} listEl  – the <ul class="batch-list"> element
 * @param {Function}         onReorder – callback(oldIndex, newIndex)
 */
function enableDragSort(listEl, onReorder) {
  let dragIdx = null;

  listEl.addEventListener("dragstart", (e) => {
    const li = e.target.closest("li");
    if (!li) return;
    dragIdx = [...listEl.children].indexOf(li);
    li.style.opacity = "0.4";
    e.dataTransfer.effectAllowed = "move";
  });

  listEl.addEventListener("dragend", (e) => {
    const li = e.target.closest("li");
    if (li) li.style.opacity = "";
    // Remove all drag-over indicators
    listEl.querySelectorAll(".drag-over").forEach((el) => el.classList.remove("drag-over"));
  });

  listEl.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const li = e.target.closest("li");
    if (!li || li === listEl.children[dragIdx]) return;
    // Clear all indicators
    listEl.querySelectorAll(".drag-over").forEach((el) => el.classList.remove("drag-over"));
    li.classList.add("drag-over");
  });

  listEl.addEventListener("drop", (e) => {
    e.preventDefault();
    listEl.querySelectorAll(".drag-over").forEach((el) => el.classList.remove("drag-over"));
    const li = e.target.closest("li");
    if (!li || dragIdx === null) return;
    const dropIdx = [...listEl.children].indexOf(li);
    if (dragIdx === dropIdx) return;

    const items = [...listEl.children];
    const dragged = items[dragIdx];
    if (dragIdx < dropIdx) {
      listEl.insertBefore(dragged, items[dropIdx].nextSibling);
    } else {
      listEl.insertBefore(dragged, items[dropIdx]);
    }

    if (onReorder) onReorder(dragIdx, dropIdx);
    dragIdx = null;
  });
}
