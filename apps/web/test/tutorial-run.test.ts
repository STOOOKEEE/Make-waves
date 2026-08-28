// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { useTutorial } from "../src/composables/useTutorial";
import { firstStepId, STEPS } from "../src/data/tutorial";

const KEY = "tide.tutorial";

beforeEach(() => {
  localStorage.clear();
  useTutorial().reset();
});

describe("machine à états du tutoriel", () => {
  it("démarre au premier passage et ne se propose qu'une fois", () => {
    const tutorial = useTutorial();
    expect(tutorial.status.value).toBe("unseen");
    expect(tutorial.shouldOffer.value).toBe(true);

    tutorial.start();
    expect(tutorial.status.value).toBe("running");
    expect(tutorial.shouldOffer.value).toBe(false);
    expect(tutorial.stepId.value).toBe(firstStepId());
  });

  it("borne la navigation aux extrémités du programme", () => {
    const tutorial = useTutorial();
    tutorial.start();
    tutorial.back();
    expect(tutorial.index.value).toBe(0);

    for (let i = 0; i < STEPS.length + 5; i += 1) tutorial.next();
    expect(tutorial.index.value).toBe(STEPS.length - 1);
    expect(tutorial.isLast.value).toBe(true);
  });

  it("ne repropose plus rien après un skip", () => {
    const tutorial = useTutorial();
    tutorial.start();
    tutorial.skip();
    expect(tutorial.status.value).toBe("skipped");
    expect(tutorial.shouldOffer.value).toBe(false);
  });

  it("reprend là où l'utilisateur s'était arrêté", () => {
    const tutorial = useTutorial();
    tutorial.start();
    tutorial.next();
    tutorial.next();
    const resumed = tutorial.stepId.value;

    // Relecture depuis le stockage : c'est ce que fait un rechargement de page.
    const raw = localStorage.getItem(KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string)).toMatchObject({
      status: "running",
      stepId: resumed,
    });
    expect(tutorial.isResumable.value).toBe(true);
  });

  it("ignore une étape inconnue au lieu de casser", () => {
    const tutorial = useTutorial();
    tutorial.start();
    const before = tutorial.stepId.value;
    tutorial.goTo("etape-qui-nexiste-pas");
    expect(tutorial.stepId.value).toBe(before);
  });

  it("marque une étape terminée une seule fois", () => {
    const tutorial = useTutorial();
    tutorial.start();
    tutorial.markCompleted("welcome");
    tutorial.markCompleted("welcome");
    expect(tutorial.completed.value.filter((id) => id === "welcome")).toHaveLength(1);
  });

  it("recommence proprement après avoir terminé", () => {
    const tutorial = useTutorial();
    tutorial.start();
    tutorial.finish();
    expect(tutorial.status.value).toBe("done");

    tutorial.start();
    expect(tutorial.status.value).toBe("running");
    expect(tutorial.stepId.value).toBe(firstStepId());
  });
});
