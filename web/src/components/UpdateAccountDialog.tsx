import { Button, Input, Textarea } from "@usememos/mui";
import { isEqual } from "lodash-es";
import { XIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { convertFileToBase64 } from "@/helpers/utils";
import useCurrentUser from "@/hooks/useCurrentUser";
import { userStore, workspaceStore } from "@/store/v2";
import { User as UserPb } from "@/types/proto/api/v1/user_service";
import { useTranslate } from "@/utils/i18n";
import { generateDialog } from "./Dialog";
import UserAvatar from "./UserAvatar";

type Props = DialogProps;

interface State {
  avatarUrl: string;
  username: string;
  nickname: string;
  email: string;
  description: string;
}

const UpdateAccountDialog = ({ destroy }: Props) => {
  const t = useTranslate();
  const currentUser = useCurrentUser();
  const [state, setState] = useState<State>({
    avatarUrl: currentUser.avatarUrl,
    username: currentUser.username,
    nickname: currentUser.nickname,
    email: currentUser.email,
    description: currentUser.description,
  });
  const workspaceGeneralSetting = workspaceStore.state.generalSetting;

  const handleCloseBtnClick = () => {
    destroy();
  };

  const setPartialState = (partialState: Partial<State>) => {
    setState((state) => {
      return {
        ...state,
        ...partialState,
      };
    });
  };

  const handleAvatarChanged = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const image = files[0];
      if (image.size > 2 * 1024 * 1024) {
        toast.error("Max file size is 2MB");
        return;
      }
      try {
        const base64 = await convertFileToBase64(image);
        setPartialState({
          avatarUrl: base64,
        });
      } catch (error) {
        console.error(error);
        toast.error(`Failed to convert image to base64`);
      }
    }
  };

  const handleNicknameChanged = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPartialState({
      nickname: e.target.value as string,
    });
  };

  const handleUsernameChanged = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPartialState({
      username: e.target.value as string,
    });
  };

  const handleEmailChanged = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState((state) => {
      return {
        ...state,
        email: e.target.value as string,
      };
    });
  };

  const handleDescriptionChanged = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setState((state) => {
      return {
        ...state,
        description: e.target.value as string,
      };
    });
  };

  const handleSaveBtnClick = async () => {
    if (state.username === "") {
      toast.error(t("message.fill-all"));
      return;
    }

    try {
      const updateMask = [];
      if (!isEqual(currentUser.username, state.username)) {
        updateMask.push("username");
      }
      if (!isEqual(currentUser.nickname, state.nickname)) {
        updateMask.push("nickname");
      }
      if (!isEqual(currentUser.email, state.email)) {
        updateMask.push("email");
      }
      if (!isEqual(currentUser.avatarUrl, state.avatarUrl)) {
        updateMask.push("avatar_url");
      }
      if (!isEqual(currentUser.description, state.description)) {
        updateMask.push("description");
      }
      await userStore.updateUser(
        UserPb.fromPartial({
          name: currentUser.name,
          username: state.username,
          nickname: state.nickname,
          email: state.email,
          avatarUrl: state.avatarUrl,
          description: state.description,
        }),
        updateMask,
      );
      toast.success(t("message.update-succeed"));
      handleCloseBtnClick();
    } catch (error: any) {
      console.error(error);
      toast.error(error.details);
    }
  };

  return (
    <div className="max-w-full shadow flex flex-col justify-start items-start bg-white dark:bg-zinc-800 dark:text-gray-300 p-4 rounded-lg">
      <div className="flex flex-row justify-between items-center mb-4 gap-2 w-full">
        <p className="title-text">{t("setting.account-section.update-information")}</p>
        <Button variant="plain" onClick={handleCloseBtnClick}>
          <XIcon className="w-5 h-auto" />
        </Button>
      </div>
      <div className="flex flex-col justify-start items-start w-64! space-y-2">
        <div className="w-full flex flex-row justify-start items-center">
          <span className="text-sm mr-2">{t("common.avatar")}</span>
          <label className="relative cursor-pointer hover:opacity-80">
            <UserAvatar className="w-10! h-10!" avatarUrl={state.avatarUrl} />
            <input type="file" accept="image/*" className="absolute invisible w-full h-full inset-0" onChange={handleAvatarChanged} />
          </label>
          {state.avatarUrl && (
            <XIcon
              className="w-4 h-auto ml-1 cursor-pointer opacity-60 hover:opacity-80"
              onClick={() =>
                setPartialState({
                  avatarUrl: "",
                })
              }
            />
          )}
        </div>
        <p className="text-sm">
          {t("common.username")}
          <span className="text-sm text-gray-400 ml-1">({t("setting.account-section.username-note")})</span>
        </p>
        <Input
          className="w-full"
          value={state.username}
          onChange={handleUsernameChanged}
          disabled={workspaceGeneralSetting.disallowChangeUsername}
        />
        <p className="text-sm">
          {t("common.nickname")}
          <span className="text-sm text-gray-400 ml-1">({t("setting.account-section.nickname-note")})</span>
        </p>
        <Input
          className="w-full"
          value={state.nickname}
          onChange={handleNicknameChanged}
          disabled={workspaceGeneralSetting.disallowChangeNickname}
        />
        <p className="text-sm">
          {t("common.email")}
          <span className="text-sm text-gray-400 ml-1">({t("setting.account-section.email-note")})</span>
        </p>
        <Input fullWidth type="email" value={state.email} onChange={handleEmailChanged} />
        <p className="text-sm">{t("common.description")}</p>
        <Textarea rows={2} fullWidth value={state.description} onChange={handleDescriptionChanged} />
        <div className="w-full flex flex-row justify-end items-center pt-4 space-x-2">
          <Button variant="plain" onClick={handleCloseBtnClick}>
            {t("common.cancel")}
          </Button>
          <Button color="primary" onClick={handleSaveBtnClick}>
            {t("common.save")}
          </Button>
        </div>
      </div>
    </div>
  );
};

function showUpdateAccountDialog() {
  generateDialog(
    {
      className: "update-account-dialog",
      dialogName: "update-account-dialog",
    },
    UpdateAccountDialog,
  );
}

export default showUpdateAccountDialog;
