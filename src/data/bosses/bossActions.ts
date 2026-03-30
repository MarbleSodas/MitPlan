import type { BossAction } from '../../types';
import bruteAbominatorActions from './brute-abominator_actions.json';
import dancingGreenActions from './dancing-green_actions.json';
import howlingBladeActions from './howling-blade_actions.json';
import ketudukeActions from './ketudukeActions.json';
import lalaActions from './lala_actions.json';
import necronActions from './necron_actions.json';
import redHotDeepBlueActions from './red-hot-deep-blue_actions.json';
import staticeActions from './statice_actions.json';
import sugarRiotActions from './sugar-riot_actions.json';
import vampFataleActions from './vamp-fatale_actions.json';
import { officialAdaptiveActionsMap } from '../timelines';

export const bossActionsMap: Record<string, BossAction[]> = {
  ketuduke: officialAdaptiveActionsMap.ketuduke || ketudukeActions,
  lala: officialAdaptiveActionsMap.lala || lalaActions,
  statice: officialAdaptiveActionsMap.statice || staticeActions,
  'dancing-green-m5s': officialAdaptiveActionsMap['dancing-green-m5s'] || dancingGreenActions,
  'sugar-riot': officialAdaptiveActionsMap['sugar-riot'] || sugarRiotActions,
  'brute-abominator-m7s': officialAdaptiveActionsMap['brute-abominator-m7s'] || bruteAbominatorActions,
  'howling-blade-m8s': officialAdaptiveActionsMap['howling-blade-m8s'] || howlingBladeActions,
  'vamp-fatale-m9s': officialAdaptiveActionsMap['vamp-fatale-m9s'] || vampFataleActions,
  'red-hot-deep-blue-m10s':
    officialAdaptiveActionsMap['red-hot-deep-blue-m10s'] || redHotDeepBlueActions,
  'the-tyrant-m11s': officialAdaptiveActionsMap['the-tyrant-m11s'] || [],
  'lindwurm-m12s': officialAdaptiveActionsMap['lindwurm-m12s'] || [],
  'lindwurm-ii-m12s': officialAdaptiveActionsMap['lindwurm-ii-m12s'] || [],
  necron: officialAdaptiveActionsMap.necron || necronActions,
};

export const bossActions = bossActionsMap.ketuduke;

export default bossActionsMap;
