(() => {
  'use strict';
  const ready = () => {
    const canvas = document.getElementById('canvas');
    if (!canvas) return;
    let state = null,
      tab = 'map',
      tablet = innerWidth <= 1180 || matchMedia('(pointer: coarse)').matches;
    const bar = document.createElement('section');
    bar.className = 'tablet-toolbar';
    bar.setAttribute('aria-label', 'Game view and controls');
    bar.innerHTML = `<div class="tablet-heading"><strong>Singularity</strong><button type="button" data-layout>Desktop overview</button></div>
      <output class="tablet-summary" aria-live="off">Loading your game…</output>
      <nav aria-label="Game panels"><button type="button" data-view="map">World map</button><button type="button" data-view="research">Research</button><button type="button" data-command="news">News</button><button type="button" data-view="overview">Overview</button></nav>
      <div class="tablet-actions"><button type="button" data-command="pause">Pause</button><button type="button" data-command="guide">Guide</button><button type="button" data-command="modes">Game modes</button></div>
      <div class="tablet-country"><label>Inspect country <select aria-label="Inspect country"></select></label><label>Map layer <select aria-label="Map layer"><option value="0">AI adoption / leaders</option><option value="1">Government policies</option></select></label></div>`;
    const stage = document.createElement('div');
    stage.className = 'tablet-stage';
    canvas.parentNode.insertBefore(bar, canvas);
    canvas.parentNode.insertBefore(stage, canvas);
    stage.append(canvas);
    canvas.width = 1440;
    canvas.height = 900;
    const select = bar.querySelector('select'),
      summary = bar.querySelector('output');
    // Dispatch after the engine's current update has returned, never re-enter WASM.
    const send = (action, value) =>
      setTimeout(
        () =>
          window.singularityTabletCommand?.(JSON.stringify({ action, value })),
        0,
      );
    const layout = () => {
      document.body.classList.toggle('tablet-layout', tablet);
      const dialog = state?.dialog;
      bar.querySelector('.tablet-country').hidden =
        !tablet || tab !== 'map' || !!dialog;
      let region = { x: 0, y: 0, width: 1440, height: 900 };
      if (tablet && dialog)
        region = {
          x: dialog.x - 8,
          y: dialog.y - 8,
          width: dialog.width + 16,
          height: dialog.height + 16,
        };
      else if (tablet && tab === 'map')
        region =
          state?.mode === 'race'
            ? { x: 16, y: 340, width: 864, height: 512 }
            : { x: 16, y: 184, width: 976, height: 658 };
      else if (tablet && tab === 'research')
        region =
          state?.mode === 'race'
            ? { x: 884, y: 327, width: 544, height: 519 }
            : { x: 996, y: 200, width: 432, height: 503 };
      const scale = tablet
        ? Math.min(
            1.65,
            stage.clientWidth / region.width,
            innerWidth > innerHeight && !dialog && tab !== 'overview'
              ? Math.max(1, (innerHeight - bar.offsetHeight) / region.height)
              : Infinity,
          )
        : Math.min(
            stage.clientWidth / 1440,
            Math.max(240, innerHeight - bar.offsetHeight) / 900,
          );
      stage.style.height = `${region.height * scale}px`;
      canvas.style.cssText = `display:block;position:absolute;width:${1440 * scale}px;height:${900 * scale}px;max-width:none;max-height:none;left:${(stage.clientWidth - region.width * scale) / 2 - region.x * scale}px;top:${-region.y * scale}px;margin:0;`;
      canvas.style.clipPath = `inset(${region.y * scale}px ${(1440 - region.x - region.width) * scale}px ${(900 - region.y - region.height) * scale}px ${region.x * scale}px)`;
      bar.querySelector('[data-layout]').textContent = tablet
        ? 'Desktop overview'
        : 'Tablet layout';
      bar.querySelectorAll('[data-view]').forEach((button) => {
        button.setAttribute(
          'aria-pressed',
          String(button.dataset.view === tab),
        );
        button.disabled = !!dialog || !state;
      });
      bar.querySelectorAll('[data-command]').forEach((button) => {
        button.disabled = !!dialog || !state;
      });
      bar.querySelector('.tablet-country').hidden =
        !tablet || tab !== 'map' || !!dialog;
      select.disabled = !!dialog || !state;
    };
    bar.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button) return;
      if (button.hasAttribute('data-layout')) {
        tablet = !tablet;
        send('presentation', tablet);
        layout();
        window.scrollTo(0, 0);
      } else if (button.dataset.view) {
        tab = button.dataset.view;
        layout();
        window.scrollTo(0, 0);
      } else if (button.dataset.command) send(button.dataset.command);
    });
    select.addEventListener('change', () =>
      send('country', Number(select.value)),
    );
    bar
      .querySelector('[aria-label="Map layer"]')
      .addEventListener('change', (event) =>
        send('layer', Number(event.target.value)),
      );
    window.singularityTabletUpdate = (data) => {
      const changedMode = state?.mode !== data.mode;
      const changedDialog =
        JSON.stringify(state?.dialog) !== JSON.stringify(data.dialog);
      state = data;
      summary.textContent = data.summary;
      bar.querySelector('[data-command="pause"]').textContent = data.paused
        ? 'Resume'
        : 'Pause';
      if (!select.options.length)
        data.countries.forEach((name, index) =>
          select.add(new Option(name, String(index))),
        );
      select.value = String(data.selected);
      if (changedMode) {
        tab = 'map';
        send('presentation', tablet);
      }
      layout();
      if (changedDialog) window.scrollTo(0, 0);
    };
    new ResizeObserver(layout).observe(document.documentElement);
    window.addEventListener('resize', layout);
    layout();
  };
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', ready);
  else ready();
})();
