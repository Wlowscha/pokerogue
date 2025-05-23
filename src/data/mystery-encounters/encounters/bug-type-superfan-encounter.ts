import type { EnemyPartyConfig } from "#app/data/mystery-encounters/utils/encounter-phase-utils";
import {
  generateModifierType,
  generateModifierTypeOption,
  initBattleWithEnemyConfig,
  leaveEncounterWithoutBattle,
  selectOptionThenPokemon,
  selectPokemonForOption,
  setEncounterRewards,
  transitionMysteryEncounterIntroVisuals,
} from "#app/data/mystery-encounters/utils/encounter-phase-utils";
import { getRandomPartyMemberFunc, trainerConfigs } from "#app/data/trainers/trainer-config";
import { TrainerPartyCompoundTemplate } from "#app/data/trainers/TrainerPartyTemplate";
import { TrainerPartyTemplate } from "#app/data/trainers/TrainerPartyTemplate";
import { TrainerSlot } from "#enums/trainer-slot";
import { MysteryEncounterType } from "#enums/mystery-encounter-type";
import { PartyMemberStrength } from "#enums/party-member-strength";
import { globalScene } from "#app/global-scene";
import { isNullOrUndefined, randSeedInt, randSeedShuffle } from "#app/utils/common";
import type MysteryEncounter from "#app/data/mystery-encounters/mystery-encounter";
import { MysteryEncounterBuilder } from "#app/data/mystery-encounters/mystery-encounter";
import { MysteryEncounterTier } from "#enums/mystery-encounter-tier";
import { TrainerType } from "#enums/trainer-type";
import { Species } from "#enums/species";
import type { PlayerPokemon } from "#app/field/pokemon";
import type Pokemon from "#app/field/pokemon";
import { PokemonMove } from "#app/field/pokemon";
import { getEncounterText, showEncounterDialogue } from "#app/data/mystery-encounters/utils/encounter-dialogue-utils";
import { LearnMovePhase } from "#app/phases/learn-move-phase";
import { Moves } from "#enums/moves";
import type { OptionSelectItem } from "#app/ui/abstact-option-select-ui-handler";
import { MysteryEncounterOptionBuilder } from "#app/data/mystery-encounters/mystery-encounter-option";
import { MysteryEncounterOptionMode } from "#enums/mystery-encounter-option-mode";
import {
  AttackTypeBoosterHeldItemTypeRequirement,
  CombinationPokemonRequirement,
  HeldItemRequirement,
  TypeRequirement,
} from "#app/data/mystery-encounters/mystery-encounter-requirements";
import { PokemonType } from "#enums/pokemon-type";
import type { AttackTypeBoosterModifierType, ModifierTypeOption } from "#app/modifier/modifier-type";
import { modifierTypes } from "#app/modifier/modifier-type";
import type { PokemonHeldItemModifier } from "#app/modifier/modifier";
import {
  AttackTypeBoosterModifier,
  BypassSpeedChanceModifier,
  ContactHeldItemTransferChanceModifier,
  GigantamaxAccessModifier,
  MegaEvolutionAccessModifier,
} from "#app/modifier/modifier";
import i18next from "i18next";
import MoveInfoOverlay from "#app/ui/move-info-overlay";
import { allMoves } from "#app/data/moves/move";
import { ModifierTier } from "#app/modifier/modifier-tier";
import { CLASSIC_MODE_MYSTERY_ENCOUNTER_WAVES } from "#app/constants";
import { getSpriteKeysFromSpecies } from "#app/data/mystery-encounters/utils/encounter-pokemon-utils";

/** the i18n namespace for the encounter */
const namespace = "mysteryEncounters/bugTypeSuperfan";

const POOL_1_POKEMON = [
  Species.PARASECT,
  Species.VENOMOTH,
  Species.LEDIAN,
  Species.ARIADOS,
  Species.YANMA,
  Species.BEAUTIFLY,
  Species.DUSTOX,
  Species.MASQUERAIN,
  Species.NINJASK,
  Species.VOLBEAT,
  Species.ILLUMISE,
  Species.ANORITH,
  Species.KRICKETUNE,
  Species.WORMADAM,
  Species.MOTHIM,
  Species.SKORUPI,
  Species.JOLTIK,
  Species.LARVESTA,
  Species.VIVILLON,
  Species.CHARJABUG,
  Species.RIBOMBEE,
  Species.SPIDOPS,
  Species.LOKIX,
];

const POOL_2_POKEMON = [
  Species.SCYTHER,
  Species.PINSIR,
  Species.HERACROSS,
  Species.FORRETRESS,
  Species.SCIZOR,
  Species.SHUCKLE,
  Species.SHEDINJA,
  Species.ARMALDO,
  Species.VESPIQUEN,
  Species.DRAPION,
  Species.YANMEGA,
  Species.LEAVANNY,
  Species.SCOLIPEDE,
  Species.CRUSTLE,
  Species.ESCAVALIER,
  Species.ACCELGOR,
  Species.GALVANTULA,
  Species.VIKAVOLT,
  Species.ARAQUANID,
  Species.ORBEETLE,
  Species.CENTISKORCH,
  Species.FROSMOTH,
  Species.KLEAVOR,
];

const POOL_3_POKEMON: { species: Species; formIndex?: number }[] = [
  {
    species: Species.PINSIR,
    formIndex: 1,
  },
  {
    species: Species.SCIZOR,
    formIndex: 1,
  },
  {
    species: Species.HERACROSS,
    formIndex: 1,
  },
  {
    species: Species.ORBEETLE,
    formIndex: 1,
  },
  {
    species: Species.CENTISKORCH,
    formIndex: 1,
  },
  {
    species: Species.DURANT,
  },
  {
    species: Species.VOLCARONA,
  },
  {
    species: Species.GOLISOPOD,
  },
];

const POOL_4_POKEMON = [Species.GENESECT, Species.SLITHER_WING, Species.BUZZWOLE, Species.PHEROMOSA];

const PHYSICAL_TUTOR_MOVES = [
  Moves.MEGAHORN,
  Moves.ATTACK_ORDER,
  Moves.BUG_BITE,
  Moves.FIRST_IMPRESSION,
  Moves.LUNGE
];

const SPECIAL_TUTOR_MOVES = [
  Moves.SILVER_WIND,
  Moves.SIGNAL_BEAM,
  Moves.BUG_BUZZ,
  Moves.POLLEN_PUFF,
  Moves.STRUGGLE_BUG
];

const STATUS_TUTOR_MOVES = [
  Moves.STRING_SHOT,
  Moves.DEFEND_ORDER,
  Moves.RAGE_POWDER,
  Moves.STICKY_WEB,
  Moves.SILK_TRAP
];

const MISC_TUTOR_MOVES = [
  Moves.LEECH_LIFE,
  Moves.U_TURN,
  Moves.HEAL_ORDER,
  Moves.QUIVER_DANCE,
  Moves.INFESTATION,
];

/**
 * Wave breakpoints that determine how strong to make the Bug-Type Superfan's team
 */
const WAVE_LEVEL_BREAKPOINTS = [30, 50, 70, 100, 120, 140, 160];

/**
 * Bug Type Superfan encounter.
 * @see {@link https://github.com/pagefaultgames/pokerogue/issues/3820 | GitHub Issue #3820}
 * @see For biome requirements check {@linkcode mysteryEncountersByBiome}
 */
export const BugTypeSuperfanEncounter: MysteryEncounter = MysteryEncounterBuilder.withEncounterType(
  MysteryEncounterType.BUG_TYPE_SUPERFAN,
)
  .withEncounterTier(MysteryEncounterTier.GREAT)
  .withPrimaryPokemonRequirement(
    CombinationPokemonRequirement.Some(
      // Must have at least 1 Bug type on team, OR have a bug item somewhere on the team
      new HeldItemRequirement(["BypassSpeedChanceModifier", "ContactHeldItemTransferChanceModifier"], 1),
      new AttackTypeBoosterHeldItemTypeRequirement(PokemonType.BUG, 1),
      new TypeRequirement(PokemonType.BUG, false, 1),
    ),
  )
  .withMaxAllowedEncounters(1)
  .withSceneWaveRangeRequirement(...CLASSIC_MODE_MYSTERY_ENCOUNTER_WAVES)
  .withIntroSpriteConfigs([]) // These are set in onInit()
  .withAutoHideIntroVisuals(false)
  .withIntroDialogue([
    {
      text: `${namespace}:intro`,
    },
    {
      speaker: `${namespace}:speaker`,
      text: `${namespace}:intro_dialogue`,
    },
  ])
  .withOnInit(() => {
    const encounter = globalScene.currentBattle.mysteryEncounter!;
    // Calculates what trainers are available for battle in the encounter

    // Bug type superfan trainer config
    const config = getTrainerConfigForWave(globalScene.currentBattle.waveIndex);
    const spriteKey = config.getSpriteKey();
    encounter.enemyPartyConfigs.push({
      trainerConfig: config,
      female: true,
    });

    let beedrillKeys: { spriteKey: string; fileRoot: string }, butterfreeKeys: { spriteKey: string; fileRoot: string };
    if (globalScene.currentBattle.waveIndex < WAVE_LEVEL_BREAKPOINTS[3]) {
      beedrillKeys = getSpriteKeysFromSpecies(Species.BEEDRILL, false);
      butterfreeKeys = getSpriteKeysFromSpecies(Species.BUTTERFREE, false);
    } else {
      // Mega Beedrill/Gmax Butterfree
      beedrillKeys = getSpriteKeysFromSpecies(Species.BEEDRILL, false, 1);
      butterfreeKeys = getSpriteKeysFromSpecies(Species.BUTTERFREE, false, 1);
    }

    encounter.spriteConfigs = [
      {
        spriteKey: beedrillKeys.spriteKey,
        fileRoot: beedrillKeys.fileRoot,
        hasShadow: true,
        repeat: true,
        isPokemon: true,
        x: -30,
        tint: 0.15,
        y: -4,
        yShadow: -4,
      },
      {
        spriteKey: butterfreeKeys.spriteKey,
        fileRoot: butterfreeKeys.fileRoot,
        hasShadow: true,
        repeat: true,
        isPokemon: true,
        x: 30,
        tint: 0.15,
        y: -4,
        yShadow: -4,
      },
      {
        spriteKey: spriteKey,
        fileRoot: "trainer",
        hasShadow: true,
        x: 4,
        y: 7,
        yShadow: 7,
      },
    ];

    const requiredItems = [
      generateModifierType(modifierTypes.QUICK_CLAW),
      generateModifierType(modifierTypes.GRIP_CLAW),
      generateModifierType(modifierTypes.ATTACK_TYPE_BOOSTER, [PokemonType.BUG]),
    ];

    const requiredItemString = requiredItems.map(m => m?.name ?? "unknown").join("/");
    encounter.setDialogueToken("requiredBugItems", requiredItemString);

    return true;
  })
  .setLocalizationKey(`${namespace}`)
  .withTitle(`${namespace}:title`)
  .withDescription(`${namespace}:description`)
  .withQuery(`${namespace}:query`)
  .withSimpleOption(
    {
      buttonLabel: `${namespace}:option.1.label`,
      buttonTooltip: `${namespace}:option.1.tooltip`,
      selected: [
        {
          speaker: `${namespace}:speaker`,
          text: `${namespace}:option.1.selected`,
        },
      ],
    },
    async () => {
      // Select battle the bug trainer
      const encounter = globalScene.currentBattle.mysteryEncounter!;
      const config: EnemyPartyConfig = encounter.enemyPartyConfigs[0];

      // Init the moves available for tutor
      const moveTutorOptions: PokemonMove[] = [];
      moveTutorOptions.push(new PokemonMove(PHYSICAL_TUTOR_MOVES[randSeedInt(PHYSICAL_TUTOR_MOVES.length)]));
      moveTutorOptions.push(new PokemonMove(SPECIAL_TUTOR_MOVES[randSeedInt(SPECIAL_TUTOR_MOVES.length)]));
      moveTutorOptions.push(new PokemonMove(STATUS_TUTOR_MOVES[randSeedInt(STATUS_TUTOR_MOVES.length)]));
      moveTutorOptions.push(new PokemonMove(MISC_TUTOR_MOVES[randSeedInt(MISC_TUTOR_MOVES.length)]));
      encounter.misc = {
        moveTutorOptions,
      };

      // Assigns callback that teaches move before continuing to rewards
      encounter.onRewards = doBugTypeMoveTutor;

      setEncounterRewards({ fillRemaining: true });
      await transitionMysteryEncounterIntroVisuals(true, true);
      await initBattleWithEnemyConfig(config);
    },
  )
  .withOption(
    MysteryEncounterOptionBuilder.newOptionWithMode(MysteryEncounterOptionMode.DISABLED_OR_DEFAULT)
      .withPrimaryPokemonRequirement(new TypeRequirement(PokemonType.BUG, false, 1)) // Must have 1 Bug type on team
      .withDialogue({
        buttonLabel: `${namespace}:option.2.label`,
        buttonTooltip: `${namespace}:option.2.tooltip`,
        disabledButtonTooltip: `${namespace}:option.2.disabled_tooltip`,
      })
      .withPreOptionPhase(async () => {
        // Player shows off their bug types
        const encounter = globalScene.currentBattle.mysteryEncounter!;

        // Player gets different rewards depending on the number of bug types they have
        const numBugTypes = globalScene.getPlayerParty().filter(p => p.isOfType(PokemonType.BUG, true)).length;
        const numBugTypesText = i18next.t(`${namespace}:numBugTypes`, {
          count: numBugTypes,
        });
        encounter.setDialogueToken("numBugTypes", numBugTypesText);

        if (numBugTypes < 2) {
          setEncounterRewards({
            guaranteedModifierTypeFuncs: [modifierTypes.SUPER_LURE, modifierTypes.GREAT_BALL],
            fillRemaining: false,
          });
          encounter.selectedOption!.dialogue!.selected = [
            {
              speaker: `${namespace}:speaker`,
              text: `${namespace}:option.2.selected_0_to_1`,
            },
          ];
        } else if (numBugTypes < 4) {
          setEncounterRewards({
            guaranteedModifierTypeFuncs: [modifierTypes.QUICK_CLAW, modifierTypes.MAX_LURE, modifierTypes.ULTRA_BALL],
            fillRemaining: false,
          });
          encounter.selectedOption!.dialogue!.selected = [
            {
              speaker: `${namespace}:speaker`,
              text: `${namespace}:option.2.selected_2_to_3`,
            },
          ];
        } else if (numBugTypes < 6) {
          setEncounterRewards({
            guaranteedModifierTypeFuncs: [modifierTypes.GRIP_CLAW, modifierTypes.MAX_LURE, modifierTypes.ROGUE_BALL],
            fillRemaining: false,
          });
          encounter.selectedOption!.dialogue!.selected = [
            {
              speaker: `${namespace}:speaker`,
              text: `${namespace}:option.2.selected_4_to_5`,
            },
          ];
        } else {
          // If the player has any evolution/form change items that are valid for their party,
          // spawn one of those items in addition to Dynamax Band, Mega Band, and Master Ball
          const modifierOptions: ModifierTypeOption[] = [generateModifierTypeOption(modifierTypes.MASTER_BALL)!];
          const specialOptions: ModifierTypeOption[] = [];

          if (!globalScene.findModifier(m => m instanceof MegaEvolutionAccessModifier)) {
            modifierOptions.push(generateModifierTypeOption(modifierTypes.MEGA_BRACELET)!);
          }
          if (!globalScene.findModifier(m => m instanceof GigantamaxAccessModifier)) {
            modifierOptions.push(generateModifierTypeOption(modifierTypes.DYNAMAX_BAND)!);
          }
          const nonRareEvolutionModifier = generateModifierTypeOption(modifierTypes.EVOLUTION_ITEM);
          if (nonRareEvolutionModifier) {
            specialOptions.push(nonRareEvolutionModifier);
          }
          const rareEvolutionModifier = generateModifierTypeOption(modifierTypes.RARE_EVOLUTION_ITEM);
          if (rareEvolutionModifier) {
            specialOptions.push(rareEvolutionModifier);
          }
          const formChangeModifier = generateModifierTypeOption(modifierTypes.FORM_CHANGE_ITEM);
          if (formChangeModifier) {
            specialOptions.push(formChangeModifier);
          }
          const rareFormChangeModifier = generateModifierTypeOption(modifierTypes.RARE_FORM_CHANGE_ITEM);
          if (rareFormChangeModifier) {
            specialOptions.push(rareFormChangeModifier);
          }
          if (specialOptions.length > 0) {
            modifierOptions.push(specialOptions[randSeedInt(specialOptions.length)]);
          }

          setEncounterRewards({
            guaranteedModifierTypeOptions: modifierOptions,
            fillRemaining: false,
          });
          encounter.selectedOption!.dialogue!.selected = [
            {
              speaker: `${namespace}:speaker`,
              text: `${namespace}:option.2.selected_6`,
            },
          ];
        }
      })
      .withOptionPhase(async () => {
        // Player shows off their bug types
        leaveEncounterWithoutBattle();
      })
      .build(),
  )
  .withOption(
    MysteryEncounterOptionBuilder.newOptionWithMode(MysteryEncounterOptionMode.DISABLED_OR_DEFAULT)
      .withPrimaryPokemonRequirement(
        CombinationPokemonRequirement.Some(
          // Meets one or both of the below reqs
          new HeldItemRequirement(["BypassSpeedChanceModifier", "ContactHeldItemTransferChanceModifier"], 1),
          new AttackTypeBoosterHeldItemTypeRequirement(PokemonType.BUG, 1),
        ),
      )
      .withDialogue({
        buttonLabel: `${namespace}:option.3.label`,
        buttonTooltip: `${namespace}:option.3.tooltip`,
        disabledButtonTooltip: `${namespace}:option.3.disabled_tooltip`,
        selected: [
          {
            text: `${namespace}:option.3.selected`,
          },
          {
            speaker: `${namespace}:speaker`,
            text: `${namespace}:option.3.selected_dialogue`,
          },
        ],
        secondOptionPrompt: `${namespace}:option.3.select_prompt`,
      })
      .withPreOptionPhase(async (): Promise<boolean> => {
        const encounter = globalScene.currentBattle.mysteryEncounter!;

        const onPokemonSelected = (pokemon: PlayerPokemon) => {
          // Get Pokemon held items and filter for valid ones
          const validItems = pokemon.getHeldItems().filter(item => {
            return (
              (item instanceof BypassSpeedChanceModifier ||
                item instanceof ContactHeldItemTransferChanceModifier ||
                (item instanceof AttackTypeBoosterModifier &&
                  (item.type as AttackTypeBoosterModifierType).moveType === PokemonType.BUG)) &&
              item.isTransferable
            );
          });

          return validItems.map((modifier: PokemonHeldItemModifier) => {
            const option: OptionSelectItem = {
              label: modifier.type.name,
              handler: () => {
                // Pokemon and item selected
                encounter.setDialogueToken("selectedItem", modifier.type.name);
                encounter.misc = {
                  chosenPokemon: pokemon,
                  chosenModifier: modifier,
                };
                return true;
              },
            };
            return option;
          });
        };

        const selectableFilter = (pokemon: Pokemon) => {
          // If pokemon has valid item, it can be selected
          const hasValidItem = pokemon.getHeldItems().some(item => {
            return (
              item instanceof BypassSpeedChanceModifier ||
              item instanceof ContactHeldItemTransferChanceModifier ||
              (item instanceof AttackTypeBoosterModifier &&
                (item.type as AttackTypeBoosterModifierType).moveType === PokemonType.BUG)
            );
          });
          if (!hasValidItem) {
            return getEncounterText(`${namespace}:option.3.invalid_selection`) ?? null;
          }

          return null;
        };

        return selectPokemonForOption(onPokemonSelected, undefined, selectableFilter);
      })
      .withOptionPhase(async () => {
        const encounter = globalScene.currentBattle.mysteryEncounter!;
        const modifier = encounter.misc.chosenModifier;
        const chosenPokemon: PlayerPokemon = encounter.misc.chosenPokemon;

        chosenPokemon.loseHeldItem(modifier, false);
        globalScene.updateModifiers(true, true);

        const bugNet = generateModifierTypeOption(modifierTypes.MYSTERY_ENCOUNTER_GOLDEN_BUG_NET)!;
        bugNet.type.tier = ModifierTier.ROGUE;

        setEncounterRewards({
          guaranteedModifierTypeOptions: [bugNet],
          guaranteedModifierTypeFuncs: [modifierTypes.REVIVER_SEED],
          fillRemaining: false,
        });
        leaveEncounterWithoutBattle(true);
      })
      .build(),
  )
  .withOutroDialogue([
    {
      text: `${namespace}:outro`,
    },
  ])
  .build();

function getTrainerConfigForWave(waveIndex: number) {
  // Bug type superfan trainer config
  const config = trainerConfigs[TrainerType.BUG_TYPE_SUPERFAN].clone();
  config.name = i18next.t("trainerNames:bug_type_superfan");

  let pool3Copy = POOL_3_POKEMON.slice(0);
  pool3Copy = randSeedShuffle(pool3Copy);
  const pool3Mon = pool3Copy.pop()!;

  if (waveIndex < WAVE_LEVEL_BREAKPOINTS[0]) {
    // Use default template (2 AVG)
    config
      .setPartyMemberFunc(0, getRandomPartyMemberFunc([Species.BEEDRILL], TrainerSlot.TRAINER, true))
      .setPartyMemberFunc(1, getRandomPartyMemberFunc([Species.BUTTERFREE], TrainerSlot.TRAINER, true));
  } else if (waveIndex < WAVE_LEVEL_BREAKPOINTS[1]) {
    config
      .setPartyTemplates(new TrainerPartyTemplate(3, PartyMemberStrength.AVERAGE))
      .setPartyMemberFunc(0, getRandomPartyMemberFunc([Species.BEEDRILL], TrainerSlot.TRAINER, true))
      .setPartyMemberFunc(1, getRandomPartyMemberFunc([Species.BUTTERFREE], TrainerSlot.TRAINER, true))
      .setPartyMemberFunc(2, getRandomPartyMemberFunc(POOL_1_POKEMON, TrainerSlot.TRAINER, true));
  } else if (waveIndex < WAVE_LEVEL_BREAKPOINTS[2]) {
    config
      .setPartyTemplates(new TrainerPartyTemplate(4, PartyMemberStrength.AVERAGE))
      .setPartyMemberFunc(0, getRandomPartyMemberFunc([Species.BEEDRILL], TrainerSlot.TRAINER, true))
      .setPartyMemberFunc(1, getRandomPartyMemberFunc([Species.BUTTERFREE], TrainerSlot.TRAINER, true))
      .setPartyMemberFunc(2, getRandomPartyMemberFunc(POOL_1_POKEMON, TrainerSlot.TRAINER, true))
      .setPartyMemberFunc(3, getRandomPartyMemberFunc(POOL_2_POKEMON, TrainerSlot.TRAINER, true));
  } else if (waveIndex < WAVE_LEVEL_BREAKPOINTS[3]) {
    config
      .setPartyTemplates(new TrainerPartyTemplate(5, PartyMemberStrength.AVERAGE))
      .setPartyMemberFunc(0, getRandomPartyMemberFunc([Species.BEEDRILL], TrainerSlot.TRAINER, true))
      .setPartyMemberFunc(1, getRandomPartyMemberFunc([Species.BUTTERFREE], TrainerSlot.TRAINER, true))
      .setPartyMemberFunc(2, getRandomPartyMemberFunc(POOL_1_POKEMON, TrainerSlot.TRAINER, true))
      .setPartyMemberFunc(3, getRandomPartyMemberFunc(POOL_2_POKEMON, TrainerSlot.TRAINER, true))
      .setPartyMemberFunc(4, getRandomPartyMemberFunc(POOL_2_POKEMON, TrainerSlot.TRAINER, true));
  } else if (waveIndex < WAVE_LEVEL_BREAKPOINTS[4]) {
    config
      .setPartyTemplates(new TrainerPartyTemplate(5, PartyMemberStrength.AVERAGE))
      .setPartyMemberFunc(
        0,
        getRandomPartyMemberFunc([Species.BEEDRILL], TrainerSlot.TRAINER, true, p => {
          p.formIndex = 1;
          p.generateAndPopulateMoveset();
          p.generateName();
        }),
      )
      .setPartyMemberFunc(
        1,
        getRandomPartyMemberFunc([Species.BUTTERFREE], TrainerSlot.TRAINER, true, p => {
          p.formIndex = 1;
          p.generateAndPopulateMoveset();
          p.generateName();
        }),
      )
      .setPartyMemberFunc(2, getRandomPartyMemberFunc(POOL_2_POKEMON, TrainerSlot.TRAINER, true))
      .setPartyMemberFunc(3, getRandomPartyMemberFunc(POOL_2_POKEMON, TrainerSlot.TRAINER, true))
      .setPartyMemberFunc(
        4,
        getRandomPartyMemberFunc([pool3Mon.species], TrainerSlot.TRAINER, true, p => {
          if (!isNullOrUndefined(pool3Mon.formIndex)) {
            p.formIndex = pool3Mon.formIndex;
            p.generateAndPopulateMoveset();
            p.generateName();
          }
        }),
      );
  } else if (waveIndex < WAVE_LEVEL_BREAKPOINTS[5]) {
    pool3Copy = randSeedShuffle(pool3Copy);
    const pool3Mon2 = pool3Copy.pop()!;
    config
      .setPartyTemplates(new TrainerPartyTemplate(5, PartyMemberStrength.AVERAGE))
      .setPartyMemberFunc(
        0,
        getRandomPartyMemberFunc([Species.BEEDRILL], TrainerSlot.TRAINER, true, p => {
          p.formIndex = 1;
          p.generateAndPopulateMoveset();
          p.generateName();
        }),
      )
      .setPartyMemberFunc(
        1,
        getRandomPartyMemberFunc([Species.BUTTERFREE], TrainerSlot.TRAINER, true, p => {
          p.formIndex = 1;
          p.generateAndPopulateMoveset();
          p.generateName();
        }),
      )
      .setPartyMemberFunc(2, getRandomPartyMemberFunc(POOL_2_POKEMON, TrainerSlot.TRAINER, true))
      .setPartyMemberFunc(
        3,
        getRandomPartyMemberFunc([pool3Mon.species], TrainerSlot.TRAINER, true, p => {
          if (!isNullOrUndefined(pool3Mon.formIndex)) {
            p.formIndex = pool3Mon.formIndex;
            p.generateAndPopulateMoveset();
            p.generateName();
          }
        }),
      )
      .setPartyMemberFunc(
        4,
        getRandomPartyMemberFunc([pool3Mon2.species], TrainerSlot.TRAINER, true, p => {
          if (!isNullOrUndefined(pool3Mon2.formIndex)) {
            p.formIndex = pool3Mon2.formIndex;
            p.generateAndPopulateMoveset();
            p.generateName();
          }
        }),
      );
  } else if (waveIndex < WAVE_LEVEL_BREAKPOINTS[6]) {
    config
      .setPartyTemplates(
        new TrainerPartyCompoundTemplate(
          new TrainerPartyTemplate(4, PartyMemberStrength.AVERAGE),
          new TrainerPartyTemplate(1, PartyMemberStrength.STRONG),
        ),
      )
      .setPartyMemberFunc(
        0,
        getRandomPartyMemberFunc([Species.BEEDRILL], TrainerSlot.TRAINER, true, p => {
          p.formIndex = 1;
          p.generateAndPopulateMoveset();
          p.generateName();
        }),
      )
      .setPartyMemberFunc(
        1,
        getRandomPartyMemberFunc([Species.BUTTERFREE], TrainerSlot.TRAINER, true, p => {
          p.formIndex = 1;
          p.generateAndPopulateMoveset();
          p.generateName();
        }),
      )
      .setPartyMemberFunc(2, getRandomPartyMemberFunc(POOL_2_POKEMON, TrainerSlot.TRAINER, true))
      .setPartyMemberFunc(
        3,
        getRandomPartyMemberFunc([pool3Mon.species], TrainerSlot.TRAINER, true, p => {
          if (!isNullOrUndefined(pool3Mon.formIndex)) {
            p.formIndex = pool3Mon.formIndex;
            p.generateAndPopulateMoveset();
            p.generateName();
          }
        }),
      )
      .setPartyMemberFunc(4, getRandomPartyMemberFunc(POOL_4_POKEMON, TrainerSlot.TRAINER, true));
  } else {
    pool3Copy = randSeedShuffle(pool3Copy);
    const pool3Mon2 = pool3Copy.pop()!;
    config
      .setPartyTemplates(
        new TrainerPartyCompoundTemplate(
          new TrainerPartyTemplate(4, PartyMemberStrength.AVERAGE),
          new TrainerPartyTemplate(1, PartyMemberStrength.STRONG),
        ),
      )
      .setPartyMemberFunc(
        0,
        getRandomPartyMemberFunc([Species.BEEDRILL], TrainerSlot.TRAINER, true, p => {
          p.setBoss(true, 2);
          p.formIndex = 1;
          p.generateAndPopulateMoveset();
          p.generateName();
        }),
      )
      .setPartyMemberFunc(
        1,
        getRandomPartyMemberFunc([Species.BUTTERFREE], TrainerSlot.TRAINER, true, p => {
          p.setBoss(true, 2);
          p.formIndex = 1;
          p.generateAndPopulateMoveset();
          p.generateName();
        }),
      )
      .setPartyMemberFunc(
        2,
        getRandomPartyMemberFunc([pool3Mon.species], TrainerSlot.TRAINER, true, p => {
          if (!isNullOrUndefined(pool3Mon.formIndex)) {
            p.formIndex = pool3Mon.formIndex;
            p.generateAndPopulateMoveset();
            p.generateName();
          }
        }),
      )
      .setPartyMemberFunc(
        3,
        getRandomPartyMemberFunc([pool3Mon2.species], TrainerSlot.TRAINER, true, p => {
          if (!isNullOrUndefined(pool3Mon2.formIndex)) {
            p.formIndex = pool3Mon2.formIndex;
            p.generateAndPopulateMoveset();
            p.generateName();
          }
        }),
      )
      .setPartyMemberFunc(4, getRandomPartyMemberFunc(POOL_4_POKEMON, TrainerSlot.TRAINER, true));
  }

  return config;
}

function doBugTypeMoveTutor(): Promise<void> {
  // biome-ignore lint/suspicious/noAsyncPromiseExecutor: TODO explain
  return new Promise<void>(async resolve => {
    const moveOptions = globalScene.currentBattle.mysteryEncounter!.misc.moveTutorOptions;
    await showEncounterDialogue(`${namespace}:battle_won`, `${namespace}:speaker`);

    const overlayScale = 1;
    const moveInfoOverlay = new MoveInfoOverlay({
      delayVisibility: false,
      scale: overlayScale,
      onSide: true,
      right: true,
      x: 1,
      y: -MoveInfoOverlay.getHeight(overlayScale, true) - 1,
      width: globalScene.game.canvas.width / 6 - 2,
    });
    globalScene.ui.add(moveInfoOverlay);

    const optionSelectItems = moveOptions.map((move: PokemonMove) => {
      const option: OptionSelectItem = {
        label: move.getName(),
        handler: () => {
          moveInfoOverlay.active = false;
          moveInfoOverlay.setVisible(false);
          return true;
        },
        onHover: () => {
          moveInfoOverlay.active = true;
          moveInfoOverlay.show(allMoves[move.moveId]);
        },
      };
      return option;
    });

    const onHoverOverCancel = () => {
      moveInfoOverlay.active = false;
      moveInfoOverlay.setVisible(false);
    };

    const result = await selectOptionThenPokemon(
      optionSelectItems,
      `${namespace}:teach_move_prompt`,
      undefined,
      onHoverOverCancel,
    );
    // let forceExit = !!result;
    if (!result) {
      moveInfoOverlay.active = false;
      moveInfoOverlay.setVisible(false);
    }

    // TODO: add menu to confirm player doesn't want to teach a move?

    // Option select complete, handle if they are learning a move
    if (result && result.selectedOptionIndex < moveOptions.length) {
      globalScene.unshiftPhase(
        new LearnMovePhase(result.selectedPokemonIndex, moveOptions[result.selectedOptionIndex].moveId),
      );
    }

    // Complete battle and go to rewards
    resolve();
  });
}
