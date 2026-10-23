import { createSSRApp, defineComponent, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { createAbby } from "../src";

const OLD_ENV = process.env;

beforeEach(() => {
  vi.resetModules();
  process.env = { ...OLD_ENV };
});

afterAll(() => {
  process.env = OLD_ENV;
});

describe("useAbby", () => {
  it("doesn't render a variant on the server", async () => {
    const { AbbyProvider, useAbby } = createAbby({
      environments: [""],
      currentEnvironment: "",
      projectId: "123",
      tests: {
        showFooter: {
          variants: ["current", "new"],
        },
      },
    });

    const ComponentWithFF = defineComponent({
      setup() {
        const { variant } = useAbby("showFooter");
        return () =>
          h("div", [
            (variant.value as string) === "" ? h("span", "SSR!") : null,
            variant.value === "current"
              ? h("span", { "data-testid": "current" }, "Secret")
              : null,
            variant.value === "new"
              ? h("span", { "data-testid": "new" }, "Very Secret")
              : null,
          ]);
      },
    });

    const App = defineComponent({
      setup() {
        return () =>
          h(
            AbbyProvider,
            {
              initialData: {
                flags: [],
                tests: [
                  {
                    name: "showFooter",
                    weights: [0.5, 0.5],
                  },
                ],
                remoteConfig: [],
              },
            },
            { default: () => h(ComponentWithFF) }
          );
      },
    });

    const serverSideDOM = await renderToString(createSSRApp(App));

    expect(serverSideDOM).toContain("SSR!");
    expect(serverSideDOM).not.toContain("Secret");
    expect(serverSideDOM).not.toContain("Very Secret");
  });
});

describe("useFeatureFlag", () => {
  it("renders the correct feature flag on the server", async () => {
    const { AbbyProvider, useFeatureFlag } = createAbby({
      environments: [""],
      currentEnvironment: "",
      projectId: "123",
      flags: ["test", "test2"],
    });

    const ComponentWithFF = defineComponent({
      setup() {
        const test = useFeatureFlag("test");
        const test2 = useFeatureFlag("test2");

        return () =>
          h("div", [
            test.value ? h("span", { "data-testid": "test" }, "Secret") : null,
            test2.value
              ? h("span", { "data-testid": "test2" }, "SUPER SECRET")
              : null,
          ]);
      },
    });

    const App = defineComponent({
      setup() {
        return () =>
          h(
            AbbyProvider,
            {
              initialData: {
                flags: [
                  {
                    value: true,
                    name: "test",
                  },
                  {
                    value: false,
                    name: "test2",
                  },
                ],
                tests: [],
                remoteConfig: [],
              },
            },
            { default: () => h(ComponentWithFF) }
          );
      },
    });

    const serverSideDOM = await renderToString(createSSRApp(App));

    expect(serverSideDOM).toContain("Secret");
    expect(serverSideDOM).not.toContain("SUPER SECRET");
  });
});

describe("getRemoteConfig", () => {
  it("renders the correct remoteConfig value on the server", async () => {
    const { AbbyProvider, useRemoteConfig } = createAbby({
      environments: [""],
      currentEnvironment: "",
      projectId: "123",
      remoteConfig: { remoteConfig1: "String" },
    });

    const ComponentWithRC = defineComponent({
      setup() {
        const remoteConfig1 = useRemoteConfig("remoteConfig1");

        return () => h("span", { "data-testid": "test" }, remoteConfig1.value);
      },
    });

    const App = defineComponent({
      setup() {
        return () =>
          h(
            AbbyProvider,
            {
              initialData: {
                flags: [
                  {
                    value: true,
                    name: "test",
                  },
                  {
                    value: false,
                    name: "test2",
                  },
                ],
                tests: [],
                remoteConfig: [{ name: "remoteConfig1", value: "FooBar" }],
              },
            },
            { default: () => h(ComponentWithRC) }
          );
      },
    });

    const serverSideDOM = await renderToString(createSSRApp(App));

    expect(serverSideDOM).toContain("FooBar");
  });
});
