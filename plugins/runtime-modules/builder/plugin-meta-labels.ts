import type { PhiBuilderPluginMeta } from "../../../types/builder";
import type { PhiCmsConfigField } from "../../../types/cms-plugins";
import type { PhiControlOption } from "../../../components/controls/phi-control-options";

/**
 * Every word a plugin shows an author, and one place that knows where they sit.
 *
 * A Layout or a Widget declares its fields in its own definition -- "Slot Mounting", "Start Slot",
 * "Wrap Around" -- and those strings went to the Inspector exactly as the plugin wrote them. There is
 * no label set to fill in for them and there cannot be one: a Module that is not ours ships fields we
 * have never seen, so the words have to be translated as they are, not looked up.
 *
 * The walk below is the whole contract. It is written once and used twice -- first to collect what a
 * plugin says, then to put the answers back -- so a text that is collected is a text that is
 * replaced, and neither list can drift from the other. What it does *not* touch matters as much: a
 * `key`, a `value`, a provider id and an icon name are addresses, not words, and translating one
 * would break the thing it names.
 */
export function mapPhiBuilderPluginMetaText(
  meta: PhiBuilderPluginMeta,
  mapText: (text: string) => string,
): PhiBuilderPluginMeta {
  return {
    ...meta,
    title: mapOptionalText(meta.title, mapText) ?? meta.title,
    ...(meta.description == null ? {} : { description: mapOptionalText(meta.description, mapText) }),
    fields: meta.fields.map((field) => mapPhiConfigFieldText(field, mapText)),
  } as PhiBuilderPluginMeta;
}

function mapOptionalText(value: string | null | undefined, mapText: (text: string) => string) {
  return value == null || value.trim().length === 0 ? value ?? undefined : mapText(value);
}

function mapPhiControlOptionText(
  option: PhiControlOption,
  mapText: (text: string) => string,
): PhiControlOption {
  return {
    ...option,
    label: mapOptionalText(option.label, mapText) ?? option.label,
    ...(option.description == null ? {} : { description: mapOptionalText(option.description, mapText) }),
    ...(option.group == null ? {} : { group: mapOptionalText(option.group, mapText) }),
  };
}

function mapPhiConfigFieldText(
  field: PhiCmsConfigField,
  mapText: (text: string) => string,
): PhiCmsConfigField {
  const mapped = {
    ...field,
    label: mapOptionalText(field.label, mapText) ?? field.label,
    ...(field.description == null ? {} : { description: mapOptionalText(field.description, mapText) }),
  } as PhiCmsConfigField;

  if (mapped.type === "choice") {
    return {
      ...mapped,
      ...(mapped.options == null ? {} : { options: mapped.options.map((option) => mapPhiControlOptionText(option, mapText)) }),
      ...(mapped.emptyOption == null ? {} : { emptyOption: mapPhiControlOptionText(mapped.emptyOption, mapText) }),
      ...(mapped.placeholder == null ? {} : { placeholder: mapOptionalText(mapped.placeholder, mapText) }),
    };
  }

  if (mapped.type === "collection") {
    return {
      ...mapped,
      itemFields: mapped.itemFields.map((itemField) => mapPhiConfigFieldText(itemField, mapText)),
      ...(mapped.addLabel == null ? {} : { addLabel: mapOptionalText(mapped.addLabel, mapText) }),
      ...(mapped.emptyLabel == null ? {} : { emptyLabel: mapOptionalText(mapped.emptyLabel, mapText) }),
    };
  }

  return mapped;
}
