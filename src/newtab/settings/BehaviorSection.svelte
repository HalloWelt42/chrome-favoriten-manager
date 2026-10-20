<script lang="ts">
  import type { ClickBehavior, PageTransition } from '../../domain/types';
  import { t } from '../../i18n';
  import Field from '../../ui/Field.svelte';
  import Segmented from '../../ui/Segmented.svelte';
  import Toggle from '../../ui/Toggle.svelte';
  import { app } from '../state.svelte';

  const nav = $derived(app.settings.navigation);
  const startup = $derived(app.settings.startup.group);
  const startupValue = $derived(typeof startup === 'object' ? startup.groupId : startup);

  function setStartup(value: string): void {
    app.patchSettings({ startup: { group: value === 'last' || value === 'default' ? value : { groupId: value } } });
  }
</script>

<h3 class="settings-heading">{t('headingOpening')}</h3>
<Field label={t('navClick')} title={t('navClickTitle')} stacked>
  <Segmented
    label={t('navClick')}
    value={nav.clickBehavior}
    options={[
      { value: 'newTab' as ClickBehavior, label: t('navClickNewTab'), icon: 'fa-regular fa-window-restore' },
      { value: 'sameTab' as ClickBehavior, label: t('navClickSameTab'), icon: 'fa-solid fa-arrow-right' }
    ]}
    onchange={(v) => app.patchSettings({ navigation: { clickBehavior: v } })}
  />
</Field>
<Field label={t('startupGroup')} title={t('startupGroupTitle')} stacked>
  <select class="input" value={startupValue} onchange={(e) => setStartup(e.currentTarget.value)}>
    <option value="last">{t('startupLast')}</option>
    <option value="default">{t('startupDefault')}</option>
    {#each app.groups as group (group.id)}
      <option value={group.id}>{group.icon} {group.name}</option>
    {/each}
  </select>
</Field>

<h3 class="settings-heading">{t('headingPaging')}</h3>
<Toggle checked={nav.keyboard} label={t('navKeyboard')} title={t('navKeyboardTitle')} onchange={(v) => app.patchSettings({ navigation: { keyboard: v } })} />
<Toggle checked={nav.mousewheel} label={t('navWheel')} title={t('navWheelTitle')} onchange={(v) => app.patchSettings({ navigation: { mousewheel: v } })} />
<Toggle checked={nav.swipe} label={t('navSwipe')} onchange={(v) => app.patchSettings({ navigation: { swipe: v } })} />
<Toggle checked={nav.showArrows} label={t('navArrows')} onchange={(v) => app.patchSettings({ navigation: { showArrows: v } })} />
<Field label={t('pageTransition')} stacked>
  <Segmented
    label={t('pageTransition')}
    value={app.settings.animations.pageTransition}
    options={[
      { value: 'slide' as PageTransition, label: t('transitionSlide') },
      { value: 'fade' as PageTransition, label: t('transitionFade') },
      { value: 'none' as PageTransition, label: t('transitionNone') }
    ]}
    onchange={(v) => app.patchSettings({ animations: { pageTransition: v } })}
  />
</Field>

<h3 class="settings-heading">{t('headingSearch')}</h3>
<Toggle checked={app.settings.search.instantSearch} label={t('searchInstant')} title={t('searchInstantTitle')} onchange={(v) => app.patchSettings({ search: { instantSearch: v } })} />
