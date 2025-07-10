import type PokemonSpecies from "#app/data/pokemon-species";
import type { HeldItem } from "#app/items/held-item";
import type { TrainerItem } from "#app/items/trainer-item";
import type { ModifierTypes } from "#app/modifier/modifier-type";
import type { HeldItemId } from "#enums/held-item-id";
import type { TrainerItemId } from "#enums/trainer-item-id";
import type { Ability } from "./abilities/ability";
import type Move from "./moves/move";

export const allAbilities: Ability[] = [];
export const allMoves: Move[] = [];
export const allSpecies: PokemonSpecies[] = [];

export const allHeldItems: Record<HeldItemId, HeldItem> = {};
export const allTrainerItems: Record<TrainerItemId, TrainerItem> = {};

// TODO: Figure out what this is used for and provide an appropriate tsdoc comment
export const modifierTypes = {} as ModifierTypes;
