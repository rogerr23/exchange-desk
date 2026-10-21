"use client";
import { Icon } from "@/components/icon";

export default function InternalError({ reset }: { reset: () => void }) {
  return (
    <section className="surface-card mx-auto max-w-lg p-10 text-center">
      <div className="mx-auto mb-5 grid size-12 place-items-center rounded-full bg-brand-soft text-brand">
        <Icon name="info" />
      </div>
      <h1 className="text-xl font-semibold">
        Não foi possível carregar esta página.
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        Tente novamente em instantes.
      </p>
      <button onClick={reset} className="button-primary mx-auto mt-6">
        Tentar novamente
      </button>
    </section>
  );
}
