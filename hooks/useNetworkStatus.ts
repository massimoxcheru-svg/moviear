import { useNetInfo } from "@react-native-community/netinfo";

/**
 * Whether the device currently has a usable connection. Unknown counts as
 * online so the banner never flashes on first render.
 */
export function useNetworkStatus() {
  const { isConnected, isInternetReachable } = useNetInfo();
  const offline = isConnected === false || isInternetReachable === false;
  return { offline };
}

export default useNetworkStatus;
