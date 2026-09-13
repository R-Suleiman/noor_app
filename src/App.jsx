import { AuthProvider } from "./context/AuthContext";
import { PlayerProvider } from "./context/PlayerContext";
import { DialogProvider } from "./context/DialogContext";
import Router from "./router/Router";
import PwaInstallPrompt from "./components/PwaInstallPrompt";
import AppErrorBoundary from "./components/AppErrorBoundary";
import NetworkStatus from "./components/NetworkStatus";

export default function App() {
  return (
    <AppErrorBoundary>
      <DialogProvider>
        <AuthProvider>
          <PlayerProvider>
            <Router />
            <NetworkStatus />
            <PwaInstallPrompt />
          </PlayerProvider>
        </AuthProvider>
      </DialogProvider>
    </AppErrorBoundary>
  );
}
