import {
  Box,
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  HStack,
  Input,
  SimpleGrid,
  Text,
  VStack,
} from "@hope-ui/solid"
import { createMemo, createSignal } from "solid-js"
import { createStore } from "solid-js/store"
import { useFetch, useManageTitle, useT } from "~/hooks"
import { Flag, PEmptyResp, PResp, Resp, SettingItem, Type } from "~/types"
import {
  getTarget,
  handleResp,
  handleRespWithoutAuthAndNotify,
  notify,
  r,
} from "~/utils"
import { setSettings as renewSettings } from "~/store"
import {
  BACKGROUND_GROUP,
  formatBytes,
  processBackgroundImage,
  resolveHomeBackground,
} from "~/components/home-background"
import { Item } from "./SettingItem"
import "./Background.css"

const fallbackItem = (key: string, value: string, type: Type): SettingItem => ({
  key,
  value,
  type,
  help: "home background",
  group: BACKGROUND_GROUP,
  flag: Flag.PUBLIC,
})

const fallbackItems = () => [
  fallbackItem("home_background", "", Type.Text),
  fallbackItem("home_background_blur", "0", Type.Number),
  fallbackItem("home_background_mask", "50", Type.Number),
]

const withFallback = (items: SettingItem[]) => {
  const result = [...items]
  for (const fallback of fallbackItems()) {
    if (!result.some((item) => item.key === fallback.key)) {
      result.push(fallback)
    }
  }
  return result
}

const presets = [
  {
    key: "aurora",
    value: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  },
  {
    key: "sunset",
    value: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  },
  {
    key: "ocean",
    value: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  },
  {
    key: "forest",
    value: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  },
  {
    key: "night",
    value: "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)",
  },
  {
    key: "paper",
    value: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
  },
]

const dataUrlBytes = (value: string) => {
  const comma = value.indexOf(",")
  if (comma < 0) return 0
  return Math.max(0, Math.floor(((value.length - comma - 1) * 3) / 4))
}

const BackgroundSettings = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.background")

  const [settings, setSettings] = createStore<SettingItem[]>(withFallback([]))
  const [settingsLoading, getSettings] = useFetch((): PResp<SettingItem[]> =>
    r.get(`/admin/setting/list?group=${BACKGROUND_GROUP}`),
  )
  const [saveLoading, saveSettings] = useFetch((): PEmptyResp =>
    r.post("/admin/setting/save", getTarget(settings)),
  )
  const [uploading, setUploading] = createSignal(false)
  let fileInput: HTMLInputElement | undefined

  const item = (key: string) =>
    settings.find((setting) => setting.key === key) ??
    fallbackItems().find((setting) => setting.key === key)!
  const value = (key: string) => item(key).value
  const setValue = (key: string, val: string) => {
    setSettings((setting) => setting.key === key, "value", val)
  }

  const refresh = async () => {
    const resp = await getSettings()
    handleResp<SettingItem[]>(resp, (data) => setSettings(withFallback(data)))
  }
  refresh()

  const isUploaded = () => value("home_background").startsWith("data:image/")
  const sourceValue = () =>
    isUploaded()
      ? t("settings.background.uploaded", {
          size: formatBytes(dataUrlBytes(value("home_background"))),
        })
      : value("home_background")

  const preview = createMemo(() =>
    resolveHomeBackground({
      value: value("home_background"),
      blur: Number(value("home_background_blur")),
      mask: Number(value("home_background_mask")),
    }),
  )

  const handleFile = async (file?: File) => {
    if (!file) return
    setUploading(true)
    try {
      const processed = await processBackgroundImage(file)
      setValue("home_background", processed.dataUrl)
      notify.success(
        t("settings.background.upload_success", {
          size: formatBytes(processed.bytes),
        }),
      )
    } catch (error) {
      const code = error instanceof Error ? error.message : "process"
      const key =
        code === "not_image"
          ? "error_not_image"
          : code === "too_large"
            ? "error_too_large"
            : "error_process"
      notify.error(t(`settings.background.${key}`))
    } finally {
      setUploading(false)
      if (fileInput) fileInput.value = ""
    }
  }

  return (
    <VStack w="$full" alignItems="start" spacing="$4">
      <Box w="$full">
        <Heading>{t("settings.background.title")}</Heading>
        <Text size="sm" color="$neutral11" mt="$1">
          {t("settings.background.description")}
        </Text>
      </Box>

      <SimpleGrid
        w="$full"
        gap="$4"
        columns={{ "@initial": 1, "@md": 2 }}
        alignItems="start"
      >
        <VStack alignItems="start" spacing="$3" w="$full">
          <FormControl w="$full">
            <FormLabel for="home_background">
              {t("settings.background.source")}
            </FormLabel>
            <Input
              id="home_background"
              value={sourceValue()}
              readOnly={isUploaded()}
              placeholder={t("settings.background.source_placeholder")}
              onInput={(e) => {
                if (!isUploaded())
                  setValue("home_background", e.currentTarget.value)
              }}
            />
            <FormHelperText>
              {t("settings.home_background-tips")}
            </FormHelperText>
          </FormControl>

          <Box w="$full">
            <Text size="sm" fontWeight="$medium" mb="$2">
              {t("settings.background.presets")}
            </Text>
            <HStack spacing="$2" flexWrap="wrap" rowGap="$2">
              {presets.map((preset) => (
                <button
                  type="button"
                  class="hb-preset"
                  classList={{
                    "hb-preset--active":
                      value("home_background") === preset.value,
                  }}
                  style={{ background: preset.value }}
                  title={t(`settings.background.preset_${preset.key}`)}
                  aria-label={t(`settings.background.preset_${preset.key}`)}
                  onClick={() => setValue("home_background", preset.value)}
                />
              ))}
            </HStack>
          </Box>

          <HStack spacing="$2" flexWrap="wrap" rowGap="$2">
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              class="hb-file-input"
              onChange={(e) => handleFile(e.currentTarget.files?.[0])}
            />
            <Button
              colorScheme="accent"
              loading={uploading()}
              onClick={() => fileInput?.click()}
            >
              {t("settings.background.upload")}
            </Button>
            <Button
              colorScheme="danger"
              variant="subtle"
              disabled={!value("home_background")}
              onClick={() => setValue("home_background", "")}
            >
              {t("settings.background.clear")}
            </Button>
          </HStack>
        </VStack>

        <VStack alignItems="start" spacing="$3" w="$full">
          <Item
            {...item("home_background_blur")}
            value={value("home_background_blur")}
            onChange={(val) => setValue("home_background_blur", val)}
          />
          <Item
            {...item("home_background_mask")}
            value={value("home_background_mask")}
            onChange={(val) => setValue("home_background_mask", val)}
          />

          <Box w="$full">
            <Text size="sm" fontWeight="$medium" mb="$1">
              {t("settings.background.preview")}
            </Text>
            <Text size="sm" color="$neutral11" mb="$2">
              {t("settings.background.preview_tip")}
            </Text>
            <div
              class="hb-preview"
              style={`--hb-preview-mask:${preview().mask / 100};`}
            >
              <div
                class="hb-preview__image"
                style={{
                  "background-image": preview().image,
                  "background-color": preview().color,
                  filter: `blur(${preview().blur}px)`,
                }}
              />
              <div class="hb-preview__mask" />
              <div class="hb-preview__content">
                <div class="hb-preview__header">
                  <span class="hb-preview__logo" />
                  <span>{t("settings.background.preview_title")}</span>
                </div>
                <div class="hb-preview__body">
                  <div class="hb-preview__crumb">
                    {t("settings.background.preview_folder")}
                  </div>
                  <div class="hb-preview__row">
                    <span class="hb-preview__icon" />
                    <span>{t("settings.background.preview_file")}</span>
                  </div>
                  <div class="hb-preview__row">
                    <span class="hb-preview__icon" />
                    <span>OpenList</span>
                  </div>
                </div>
              </div>
            </div>
          </Box>
        </VStack>
      </SimpleGrid>

      <HStack spacing="$2">
        <Button
          colorScheme="accent"
          onClick={refresh}
          loading={settingsLoading() || saveLoading() || uploading()}
        >
          {t("global.refresh")}
        </Button>
        <Button
          loading={saveLoading()}
          disabled={uploading()}
          onClick={async () => {
            const resp = await saveSettings()
            handleResp(resp, async () => {
              notify.success(t("global.save_success"))
              handleRespWithoutAuthAndNotify(
                (await r.get("/public/settings")) as Resp<
                  Record<string, string>
                >,
                renewSettings,
              )
            })
          }}
        >
          {t("global.save")}
        </Button>
      </HStack>
    </VStack>
  )
}

export default BackgroundSettings
