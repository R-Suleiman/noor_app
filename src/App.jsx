import { AuthProvider } from "./context/AuthContext";
import { PlayerProvider } from "./context/PlayerContext";
import { DialogProvider } from "./context/DialogContext";
import Router from "./router/Router";
import PwaInstallPrompt from "./components/PwaInstallPrompt";

export default function App() {
  return (
    <DialogProvider>
      <AuthProvider>
        <PlayerProvider>
          <Router />
          <PwaInstallPrompt />
        </PlayerProvider>
      </AuthProvider>
    </DialogProvider>
  );
}
