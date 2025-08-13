import { uniqBy } from "lodash-es";
import { makeAutoObservable } from "mobx";
import { workspaceServiceClient } from "@/grpcweb";
import { WorkspaceProfile, WorkspaceSetting_Key } from "@/types/proto/api/v1/workspace_service";
import {
  WorkspaceSetting_GeneralSetting,
  WorkspaceSetting_MemoRelatedSetting,
  WorkspaceSetting,
} from "@/types/proto/api/v1/workspace_service";
import { isValidateLocale } from "@/utils/i18n";
import { workspaceSettingNamePrefix } from "./common";

class LocalState {
  locale: string = "en";
  appearance: string = "system";
  profile: WorkspaceProfile = WorkspaceProfile.fromPartial({});
  settings: WorkspaceSetting[] = [];

  get generalSetting() {
    return (
      this.settings.find((setting) => setting.name === `${workspaceSettingNamePrefix}${WorkspaceSetting_Key.GENERAL}`)?.generalSetting ||
      WorkspaceSetting_GeneralSetting.fromPartial({})
    );
  }

  get memoRelatedSetting() {
    return (
      this.settings.find((setting) => setting.name === `${workspaceSettingNamePrefix}${WorkspaceSetting_Key.MEMO_RELATED}`)
        ?.memoRelatedSetting || WorkspaceSetting_MemoRelatedSetting.fromPartial({})
    );
  }

  constructor() {
    makeAutoObservable(this);
  }

  setPartial(partial: Partial<LocalState>) {
    const finalState = {
      ...this,
      ...partial,
    };
    if (!isValidateLocale(finalState.locale)) {
      finalState.locale = "en";
    }
    if (!["system", "light", "dark"].includes(finalState.appearance)) {
      finalState.appearance = "system";
    }
    Object.assign(this, finalState);
  }
}

const workspaceStore = (() => {
  const state = new LocalState();

  const fetchWorkspaceSetting = async (settingKey: WorkspaceSetting_Key) => {
    const setting = await workspaceServiceClient.getWorkspaceSetting({ name: `${workspaceSettingNamePrefix}${settingKey}` });
    state.setPartial({
      settings: uniqBy([setting, ...state.settings], "name"),
    });
  };

  const upsertWorkspaceSetting = async (setting: WorkspaceSetting) => {
    await workspaceServiceClient.updateWorkspaceSetting({ setting });
    state.setPartial({
      settings: uniqBy([setting, ...state.settings], "name"),
    });
  };

  const getWorkspaceSettingByKey = (settingKey: WorkspaceSetting_Key) => {
    return (
      state.settings.find((setting) => setting.name === `${workspaceSettingNamePrefix}${settingKey}`) || WorkspaceSetting.fromPartial({})
    );
  };

  return {
    state,
    fetchWorkspaceSetting,
    upsertWorkspaceSetting,
    getWorkspaceSettingByKey,
  };
})();

export const initialWorkspaceStore = async () => {
  const workspaceProfile = await workspaceServiceClient.getWorkspaceProfile({});
  // Prepare workspace settings.
  for (const key of [WorkspaceSetting_Key.GENERAL, WorkspaceSetting_Key.MEMO_RELATED]) {
    await workspaceStore.fetchWorkspaceSetting(key);
  }

  const workspaceGeneralSetting = workspaceStore.state.generalSetting;
  workspaceStore.state.setPartial({
    locale: workspaceGeneralSetting.customProfile?.locale,
    appearance: workspaceGeneralSetting.customProfile?.appearance,
    profile: workspaceProfile,
  });
};

export default workspaceStore;
