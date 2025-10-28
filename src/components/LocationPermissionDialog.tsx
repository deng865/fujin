import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MapPin } from "lucide-react";

interface LocationPermissionDialogProps {
  open: boolean;
  onSelect: (permission: "once" | "always" | "never") => void;
}

export const LocationPermissionDialog = ({
  open,
  onSelect,
}: LocationPermissionDialogProps) => {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-5 w-5 text-primary" />
            <AlertDialogTitle>位置权限请求</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            为了提供更好的拼车服务，我们需要获取您的位置信息。请选择您的偏好设置：
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <AlertDialogAction
            onClick={() => onSelect("always")}
            className="w-full"
          >
            使用APP时允许
          </AlertDialogAction>
          <AlertDialogAction
            onClick={() => onSelect("once")}
            className="w-full bg-secondary hover:bg-secondary/80"
          >
            允许一次
          </AlertDialogAction>
          <AlertDialogCancel
            onClick={() => onSelect("never")}
            className="w-full mt-0"
          >
            不允许
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
