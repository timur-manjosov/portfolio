/**
 * Project filter (status + tag). Progressive enhancement: without JS the
 * controls stay hidden and every project is listed. State is mirrored in the
 * query string (?stage=…&tag=…) so a filtered view can be shared.
 */
export {};

const controls = document.querySelector<HTMLFieldSetElement>("[data-project-filters]");
const list = document.querySelector<HTMLElement>("[data-project-list]");
const status = document.querySelector<HTMLElement>("[data-filter-status]");
const empty = document.querySelector<HTMLElement>("[data-filter-empty]");

if (controls && list && status && empty) {
  const stageSelect = controls.querySelector<HTMLSelectElement>('select[name="stage"]');
  const tagSelect = controls.querySelector<HTMLSelectElement>('select[name="tag"]');
  const reset = controls.querySelector<HTMLButtonElement>("[data-filter-reset]");
  const items = [...list.querySelectorAll<HTMLElement>("li[data-stage]")];
  // UI text comes from src/i18n/ui.ts via a data attribute, not from this file.
  const suffix = status.dataset.msgCount ?? "";

  const apply = (updateUrl: boolean): void => {
    const stage = stageSelect?.value ?? "";
    const tag = tagSelect?.value ?? "";
    let shown = 0;
    for (const item of items) {
      const tags = (item.dataset.tags ?? "").split(" ");
      const visible = (!stage || item.dataset.stage === stage) && (!tag || tags.includes(tag));
      item.hidden = !visible;
      if (visible) shown++;
    }
    status.textContent = `${shown} / ${items.length} ${suffix}`;
    empty.hidden = shown > 0;
    if (updateUrl) {
      const url = new URL(window.location.href);
      if (stage) url.searchParams.set("stage", stage);
      else url.searchParams.delete("stage");
      if (tag) url.searchParams.set("tag", tag);
      else url.searchParams.delete("tag");
      history.replaceState(null, "", url);
    }
  };

  const params = new URLSearchParams(window.location.search);
  const setIfValid = (select: HTMLSelectElement | null, value: string | null): void => {
    if (select && value && [...select.options].some((o) => o.value === value)) select.value = value;
  };
  setIfValid(stageSelect, params.get("stage"));
  setIfValid(tagSelect, params.get("tag"));

  stageSelect?.addEventListener("change", () => apply(true));
  tagSelect?.addEventListener("change", () => apply(true));
  reset?.addEventListener("click", () => {
    if (stageSelect) stageSelect.value = "";
    if (tagSelect) tagSelect.value = "";
    apply(true);
  });

  controls.hidden = false;
  status.hidden = false;
  apply(false);
}
