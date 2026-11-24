import { afterEach, describe, expect, it, vi } from "vitest";

import { PHI_CUSTOMER_FILE_RESOURCE_KEYS as RESOURCES } from "../../../../constants/customer-file";
import { PHI_THREADS_CUSTOMER_FILE_TABLE_PROVIDER_REGISTRATION as PROVIDER } from "./customer-file-table";

const FILE = {
  person: {
    userId: 5,
    displayName: "Ada",
    addresses: [{ id: 1, line1: "Main Street 1" }],
  },
  fileThreadId: 9,
  threads: [],
};

function stubFetch() {
  const fetchMock = vi.fn((_path: string, init?: RequestInit) => new Promise<Response>((resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
    setTimeout(() => resolve(Response.json(FILE)), 0);
  }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function read(resourceKey: string, signal?: AbortSignal) {
  return PROVIDER.query({ resourceKey, query: { filters: { userId: 5 } }, signal } as never);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the customer file's Provider", () => {
  it("answers the three resources read for one member at once with one request, and asks again after it settled", async () => {
    const fetchMock = stubFetch();
    const [person, addresses, threads] = await Promise.all([
      read(RESOURCES.person, new AbortController().signal),
      read(RESOURCES.addresses, new AbortController().signal),
      read(RESOURCES.threads, new AbortController().signal),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![0]).toBe("/api/site/members/5/file?page=1&pageSize=25");
    expect(person.rows).toEqual([expect.objectContaining({ userId: 5, displayName: "Ada" })]);
    expect(addresses.rows).toHaveLength(1);
    expect(threads.rows).toEqual([expect.objectContaining({ id: 9 })]);

    await read(RESOURCES.person, new AbortController().signal);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("asks for another page of threads on its own", async () => {
    const fetchMock = stubFetch();
    await Promise.all([
      read(RESOURCES.person),
      PROVIDER.query({ resourceKey: RESOURCES.threads, query: { filters: { userId: 5 }, page: 2 } } as never),
    ]);
    expect(fetchMock.mock.calls.map(([path]) => path)).toEqual([
      "/api/site/members/5/file?page=1&pageSize=25",
      "/api/site/members/5/file?page=2&pageSize=25",
    ]);
  });

  it("keeps the request for the others when one Table aborts, and aborts it when the last one has", async () => {
    const fetchMock = stubFetch();
    const first = new AbortController();
    const second = new AbortController();
    const aborted = read(RESOURCES.person, first.signal);
    const kept = read(RESOURCES.addresses, second.signal);
    first.abort();
    await expect(aborted).rejects.toMatchObject({ name: "AbortError" });
    expect((fetchMock.mock.calls[0]![1] as RequestInit).signal!.aborted).toBe(false);
    await expect(kept).resolves.toMatchObject({ total: 1 });

    const third = new AbortController();
    const fourth = new AbortController();
    const left = [read(RESOURCES.person, third.signal), read(RESOURCES.threads, fourth.signal)];
    third.abort();
    fourth.abort();
    await Promise.allSettled(left);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((fetchMock.mock.calls[1]![1] as RequestInit).signal!.aborted).toBe(true);

    // An aborted request is not joined: the next read asks afresh.
    await read(RESOURCES.person, new AbortController().signal);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("reads nothing before a member is chosen", async () => {
    const fetchMock = stubFetch();
    await PROVIDER.query({ resourceKey: RESOURCES.person, query: {} } as never);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
