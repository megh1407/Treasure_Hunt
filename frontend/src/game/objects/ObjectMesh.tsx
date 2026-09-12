import type { GameObject } from "../types";
import { InteractiveObject } from "./interactive/InteractiveObject";
import {
  BoxMesh,
  CabinetMesh,
  ChairMesh,
  ComputerMesh,
  FallbackMesh,
  LockerMesh,
  NoticeboardMesh,
  PaintingMesh,
  TableMesh,
} from "./common";
import { BookMesh, BookshelfMesh } from "./library";

/**
 * Renders the visual 3D mesh corresponding to a GameObject's kind.
 * Reusable across any interior room or environment.
 */
export function ObjectKindMesh({ object }: { object: GameObject }) {
  switch (object.kind) {
    case "bookshelf":
      return <BookshelfMesh />;
    case "book":
      return <BookMesh />;
    case "computer":
      return <ComputerMesh />;
    case "table":
      return <TableMesh />;
    case "chair":
      return <ChairMesh />;
    case "cabinet":
      return <CabinetMesh />;
    case "locker":
      return <LockerMesh />;
    case "box":
      return <BoxMesh />;
    case "painting":
      return <PaintingMesh />;
    case "noticeboard":
      return <NoticeboardMesh />;
    default:
      return <FallbackMesh />;
  }
}

/**
 * Complete interactive 3D object representation for quest objects and interactables.
 * Combines spatial transform, mesh rendering, and proximity highlight ring.
 */
export function ObjectMesh({ object, highlighted }: { object: GameObject; highlighted: boolean }) {
  return (
    <InteractiveObject object={object} highlighted={highlighted}>
      <ObjectKindMesh object={object} />
    </InteractiveObject>
  );
}
