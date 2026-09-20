// @vitest-environment node
import { describe, expect, it } from "vitest";
import { zoneClass, zoneState } from "../src/lib/sandbox/spotlight";

describe("projecteur du tutoriel", () => {
  it("laisse tout neutre quand l'étape ne vise rien", () => {
    expect(zoneState(undefined, "ticket")).toBe("plain");
    expect(zoneState("", "chart")).toBe("plain");
  });

  it("met en lumière la zone visée", () => {
    expect(zoneState("chart", "chart")).toBe("spot");
  });

  it("met en retrait tout ce qui n'est pas concerné", () => {
    expect(zoneState("chart", "ticket")).toBe("dim");
    expect(zoneState("chart", "watchlist")).toBe("dim");
    expect(zoneState("ticket.leverage", "book")).toBe("dim");
  });

  it("ne floute jamais le conteneur de la cible", () => {
    // Sinon le filtre CSS serait hérité et la cible serait floutée elle aussi.
    expect(zoneState("ticket.leverage", "ticket")).toBe("plain");
    expect(zoneState("chart.mode", "chart")).toBe("plain");
  });

  it("n'allume pas les descendants de la cible", () => {
    // Un anneau par sous-zone donnerait onze anneaux rouges sur le ticket :
    // seul le conteneur visé est cerclé, ses enfants restent neutres.
    expect(zoneState("ticket", "ticket.leverage")).toBe("plain");
    expect(zoneState("ticket", "ticket.summary")).toBe("plain");
    expect(zoneState("blotter", "blotter.close")).toBe("plain");
  });

  it("n'allume jamais plus d'une zone à la fois", () => {
    const zones = [
      "watchlist", "chart", "chart.price", "chart.mode", "book",
      "ticket", "ticket.product", "ticket.leverage", "ticket.summary",
      "blotter", "blotter.close", "accelerate",
    ];
    for (const target of zones) {
      const lit = zones.filter((zone) => zoneState(target, zone) === "spot");
      expect(lit, `cible ${target}`).toEqual([target]);
    }
  });

  it("met en retrait les zones sœurs de la cible", () => {
    expect(zoneState("ticket.leverage", "ticket.amount")).toBe("dim");
    expect(zoneState("ticket.leverage", "ticket.place")).toBe("dim");
  });

  it("ne confond pas un préfixe de nom avec une hiérarchie", () => {
    // « ticket » ne contient pas « ticketing » : la séparation est le point.
    expect(zoneState("ticket", "ticketing")).toBe("dim");
    expect(zoneState("chart", "chartcard")).toBe("dim");
  });

  it("rend des classes exploitables directement dans un template", () => {
    expect(zoneClass("ticket.leverage", "ticket.leverage")).toEqual({
      "zone-spot": true,
      "zone-dim": false,
    });
    expect(zoneClass("ticket.leverage", "chart")).toEqual({
      "zone-spot": false,
      "zone-dim": true,
    });
    expect(zoneClass("ticket.leverage", "ticket")).toEqual({
      "zone-spot": false,
      "zone-dim": false,
    });
    expect(zoneClass("ticket", "ticket.leverage")).toEqual({
      "zone-spot": false,
      "zone-dim": false,
    });
  });
});
