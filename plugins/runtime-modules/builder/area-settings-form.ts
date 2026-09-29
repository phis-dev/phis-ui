import { definePhiRuntimeModuleForm } from "../../../components/forms/form-registry";
import { PHI_FORM_FIELD_PROVIDER_KEYS } from "../../../components/forms/form-provider-contract";
import type { PhiFormDescriptor } from "../../../types/form-descriptor";
import { createPhiFormId } from "../../../types/form-id";
import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import { PHI_BUILDER_RUNTIME_MODULE_ID, PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS } from "./ids";
import {
  PHI_BUILDER_AREA_LANDING_PAGE_EMPTY,
  PHI_BUILDER_AREA_ROOT_ROUTE_AUTOMATIC,
  PHI_BUILDER_AREA_ROOT_ROUTE_LANDING,
} from "./area-settings-values";

export const PHI_BUILDER_AREA_SETTINGS_FORM_ID =
  createPhiFormId(PHI_SHARED_PACKAGE_NAME, "builder/area-settings");

/**
 * Every sentence an Area says about itself, read from where the form stands.
 *
 * `config` rather than `label`: a Form label set is loaded by the form's own registration, and these
 * strings are already loaded -- the Builder's preset holds the whole translated chrome label set when
 * it places this form, and wrote them straight into the Widget configs before. Taking them from the
 * placement keeps one translation source for the dialog instead of two that have to be kept saying
 * the same thing.
 */
const text = (key: string, fallback: string) => ({ kind: "config", key, fallback } as const);

/**
 * What an Area answers about itself, as one form rather than as six Controls that each carry a label.
 *
 * The form is what puts the labels in a column of their own: `PHI_FORM_DEFAULT_LAYOUT` gives every
 * field a label range of 1-9 and a control range of 9-25, so six rows line up on one edge instead of
 * each being indented by the width of its own caption. That is the whole reason this is a form and
 * not a stack -- the questions did not change.
 *
 * Field keys are the keys the Controls carried, because the Builder's controller reads the submitted
 * record by them and the Area's stored config is written from the same names.
 */
const descriptor: PhiFormDescriptor = {
  schemaVersion: 1,
  key: PHI_BUILDER_AREA_SETTINGS_FORM_ID,
  fields: [
    /*
     * Where `/` goes. The two answers that are not a Page are stated here rather than by the
     * Provider: they are the same two on every Site, and a static option carries the placement's
     * translated caption, which a Client Provider has no way to reach.
     */
    {
      key: "areaRootRoute",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
      label: text("rootRouteTitle", "Area root"),
      options: [
        {
          value: PHI_BUILDER_AREA_ROOT_ROUTE_AUTOMATIC,
          label: text("rootRouteAutomatic", "First navigation entry"),
        },
        {
          value: PHI_BUILDER_AREA_ROOT_ROUTE_LANDING,
          label: text("rootRouteLanding", "Landing page"),
        },
      ],
      optionsProvider: { providerKey: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.areaRootRoute },
    },
    /*
     * Which landing answers the slot, asked only once the answer above is "landing".
     *
     * Shown rather than disabled, which is what the Control it replaces did by signal: a question
     * that does not apply is not a question an Area left unanswered, and a greyed-out Select beside a
     * root that forwards reads as one.
     */
    {
      key: "areaLandingPage",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
      label: text("landingPageLabel", "Landing"),
      options: [
        {
          value: PHI_BUILDER_AREA_LANDING_PAGE_EMPTY,
          label: text("landingPageEmpty", "Builder"),
        },
      ],
      optionsProvider: { providerKey: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.landingPage },
      visibleWhen: {
        source: "form",
        valuePath: "areaRootRoute",
        operator: "equals",
        value: PHI_BUILDER_AREA_ROOT_ROUTE_LANDING,
      },
    },
    /*
     * What the Area writes into the title of every Page it draws. Both may be left alone -- an Area
     * that says nothing here still gets titles -- which is why the placeholders state the resting
     * value rather than repeating the label.
     */
    {
      key: "areaTitleTemplate",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.text,
      label: text("titleTemplateLabel", "Title template"),
      placeholder: text("titleTemplatePlaceholder", "%s -- site name"),
      config: { allowClear: true },
    },
    {
      key: "areaDefaultTitle",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.text,
      label: text("defaultTitleLabel", "Default title"),
      placeholder: text("defaultTitlePlaceholder", "Site name"),
      config: { allowClear: true },
    },
    /*
     * What the Area says about being found, and who may say it.
     *
     * Shown in every Area and answerable in none but Public, so they are disabled rather than hidden:
     * outside Public the answer is still true -- an authenticated Area is never indexed -- and a
     * switch that vanishes reads as a question nobody thought to ask. Which Area this is arrives with
     * the values, in `seoLocked`, because a form may only ask its own record.
     */
    {
      key: "areaMetaIndex",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.switch,
      label: text("seoIndexLabel", "Allow indexing"),
      disabledWhen: { source: "form", valuePath: "seoLocked", operator: "equals", value: "true" },
    },
    {
      key: "areaMetaSitemap",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.switch,
      label: text("seoSitemapLabel", "List pages in the sitemap"),
      disabledWhen: { source: "form", valuePath: "seoLocked", operator: "equals", value: "true" },
    },
    {
      key: "seoLocked",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.hidden,
      initialValue: "false",
    },
  ],
};

export const PHI_BUILDER_AREA_SETTINGS_FORM = definePhiRuntimeModuleForm({
  ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
  areas: ["builder"],
  formId: PHI_BUILDER_AREA_SETTINGS_FORM_ID,
  version: 1,
  flags: 0,
  title: "Builder area settings",
  description: "Edit what an Area says about its root, its titles and being found.",
  category: "forms",
  tags: ["builder", "area"],
  descriptor,
  submitHandlerKey: null,
});
