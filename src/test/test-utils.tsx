import { render, type RenderOptions } from "@testing-library/react";
import { I18nProvider } from "@/i18n/I18nContext";

type CustomRenderOptions = RenderOptions & { locale?: string };

function customRender(ui: React.ReactElement, options?: CustomRenderOptions) {
  const { locale, ...renderOptions } = options ?? {};
  if (locale) localStorage.setItem("locale", locale);
  function AllProviders({ children }: { children: React.ReactNode }) {
    return <I18nProvider>{children}</I18nProvider>;
  }
  return render(ui, { wrapper: AllProviders, ...renderOptions });
}

export * from "@testing-library/react";
export { customRender as render };
