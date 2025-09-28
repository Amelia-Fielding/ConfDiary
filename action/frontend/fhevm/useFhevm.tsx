import { ethers } from "ethers";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FhevmInstance } from "./fhevmTypes";
import { createFhevmInstance, FhevmAbortError } from "./internal/fhevm";

function _assert(condition: boolean, message?: string): asserts condition {
  if (!condition) {
    const m = message ? `Assertion failed: ${message}` : `Assertion failed.`;
    console.error(m);
    throw new Error(m);
  }
}

export type FhevmGoState = "idle" | "loading" | "ready" | "error";

export function useFhevm(parameters: {
  provider: string | ethers.Eip1193Provider | undefined;
  chainId: number | undefined;
  enabled?: boolean;
  initialMockChains?: Readonly<Record<number, string>>;  
}): {
  instance: FhevmInstance | undefined;
  refresh: () => void;
  error: Error | undefined;
  status: FhevmGoState;
} {
  const { provider, chainId, initialMockChains, enabled = true } = parameters;

  const [instance, _setInstance] = useState<FhevmInstance | undefined>(undefined);
  const [status, _setStatus] = useState<FhevmGoState>("idle");
  const [error, _setError] = useState<Error | undefined>(undefined);
  const [_isRunning, _setIsRunning] = useState<boolean>(enabled);
  const [_providerChanged, _setProviderChanged] = useState<number>(0);
  const _abortControllerRef = useRef<AbortController | null>(null);
  const _providerRef = useRef<string | ethers.Eip1193Provider | undefined>(provider);
  const _chainIdRef = useRef<number | undefined>(chainId);
  const _mockChainsRef = useRef<Record<number, string> | undefined>(initialMockChains);

  const refresh = useCallback(() => {
    console.log("[useFhevm] Manual refresh triggered");
    
    // Abort current operation
    if (_abortControllerRef.current) {
      _abortControllerRef.current.abort();
      _abortControllerRef.current = null;
    }

    // Reset state
    _setInstance(undefined);
    _setError(undefined);
    _setStatus("idle");
  }, []);

  useEffect(() => {
    _setIsRunning(enabled);
  }, [enabled]);

  // Main useEffect - 直接依赖 provider/chainId 避免双触发
  useEffect(() => {
    // Update refs first
    _providerRef.current = provider;
    _chainIdRef.current = chainId;
    // is _providerRef.current valid here ?
    // even if the first useEffect is rendered in the same render-cycle ?
    if (_isRunning === false) {
      // cancelled
      console.log("useFhevm cancelled");
      if (_abortControllerRef.current) {
        _abortControllerRef.current.abort();
        _abortControllerRef.current = null;
      }
      // May already be null if provider was changed in the previous render-cycle
      _setInstance(undefined);
      _setError(undefined);
      _setStatus("idle");
      return;
    }

    if (_isRunning === true) {
      if (_providerRef.current === undefined) {
        // instance should be undefined
        // this code below should be unecessary
        _setInstance(undefined);
        _setError(undefined);
        _setStatus("idle");
        return;
      }

      // Skip if instance is already being created
      if (_abortControllerRef.current && !_abortControllerRef.current.signal.aborted) {
        console.log("[useFhevm] Instance creation already in progress, skipping...");
        return;
      }

      if (!_abortControllerRef.current) {
        _abortControllerRef.current = new AbortController();
      }

      // Keep old instance
      // Was set to undefined if provider changed
      _setStatus("loading");
      _setError(undefined);

      const thisSignal = _abortControllerRef.current.signal;
      const thisProvider = _providerRef.current;
      // Can be undefined, if so, call eth_chainId
      const thisRpcUrlsByChainId = _mockChainsRef.current;

      // 调用前短路，避免在已取消的信号上再次发起创建
      if (thisSignal.aborted) {
        console.log(`[useFhevm] Signal already aborted, skipping instance creation`);
        return;
      }

      createFhevmInstance({
        signal: thisSignal,
        provider: thisProvider,
        mockChains: thisRpcUrlsByChainId,
        onStatusChange: (s) =>
          console.log(`[useFhevm] createFhevmInstance status changed: ${s}`),
      })
        .then((i) => {
          console.log(`[useFhevm] createFhevmInstance created successfully!`);
          if (thisSignal.aborted) {
            console.log(`[useFhevm] Signal aborted, ignoring result`);
            return;
          }

          // is there a edge case where the assert below would fail ?
          // it's not possible to have a _providerRef modified without a prior abort
          _assert(
            thisProvider === _providerRef.current,
            "thisProvider === _providerRef.current"
          );

          _setInstance(i);
          _setError(undefined);
          _setStatus("ready");
          console.log(`[useFhevm] Instance ready!`);
        })
        .catch((e) => {
          // 只在"非取消"时打印错误日志（避免控制台红错）
          if (e instanceof FhevmAbortError || e.name === 'FhevmAbortError') {
            console.log(`[useFhevm] Instance creation was cancelled (normal behavior)`);
            return;
          }

          console.error(`[useFhevm] Error creating instance:`, e);
          if (thisSignal.aborted) {
            console.log(`[useFhevm] Signal aborted, ignoring error`);
            return;
          }

          // it's not possible to have a _providerRef modified without a prior abort
          _assert(
            thisProvider === _providerRef.current,
            "thisProvider === _providerRef.current"
          );

          _setInstance(undefined);
          _setError(e);
          _setStatus("error");
        });
    }
  }, [_isRunning, provider, chainId]); // 直接依赖 provider 和 chainId

  return { instance, refresh, error, status };
}
