import {
  AppSettings,
  Diagrams,
  Links,
  WorkspaceElements,
  WorkspaceLinks,
  WorkspaceTerms,
} from "../config/Variables";
import { initElements, parsePrefix } from "./FunctionEditVars";
import { graph } from "../graph/Graph";
import {
  getActiveToConnections,
  getElementShape,
  getLinkOrVocabElem,
  getNewLink,
} from "./FunctionGetVars";
import * as joint from "jointjs";
import * as _ from "lodash";
import { graphElement } from "../graph/GraphElement";
import { addLink } from "./FunctionCreateVars";
import { Cardinality } from "../datatypes/Cardinality";
import { LinkType, Representation } from "../config/Enum";
import { drawGraphElement } from "./FunctionDraw";
import {
  updateDeleteProjectLinkVertex,
  updateProjectLink,
} from "../queries/update/UpdateLinkQueries";
import {
  updateProjectElement,
  updateProjectElementDiagram,
} from "../queries/update/UpdateElementQueries";
import {
  fetchReadOnlyTerms,
  fetchRelationships,
} from "../queries/get/CacheQueries";
import { initConnections } from "./FunctionRestriction";
import isUrl from "is-url";
import { getOtherConnectionElementID } from "./FunctionLink";
import { insertNewCacheTerms, insertNewRestrictions } from "./FunctionCache";
import { updateProjectSettings } from "../queries/update/UpdateMiscQueries";

export const mvp1IRI =
  "https://slovník.gov.cz/základní/pojem/má-vztažený-prvek-1";
export const mvp2IRI =
  "https://slovník.gov.cz/základní/pojem/má-vztažený-prvek-2";

export function nameGraphLink(cell: joint.dia.Link, languageCode: string) {
  if (
    typeof cell.id === "string" &&
    WorkspaceLinks[cell.id].type === LinkType.DEFAULT
  ) {
    const label = getLinkOrVocabElem(WorkspaceLinks[cell.id].iri).labels[
      languageCode
    ];
    if (label) {
      let labels = cell.labels();
      labels.forEach((linkLabel, i) => {
        if (!linkLabel.attrs?.text?.text?.match(/^\d|\*/)) {
          cell.label(i, {
            attrs: {
              text: {
                text: label,
              },
            },
            position: {
              distance: 0.5,
            },
          });
        }
      });
    }
  }
}

export async function spreadConnections(
  id: string,
  elements: string[]
): Promise<string[]> {
  const ids = elements
    .filter((link) => !isUrl(link))
    .map((link) => getOtherConnectionElementID(link, id));
  const iris = elements.filter((iri) => isUrl(iri));
  let queries: string[] = [];
  if (iris.length > 0) {
    insertNewCacheTerms(
      await fetchReadOnlyTerms(AppSettings.contextEndpoint, iris)
    );
    insertNewRestrictions(
      await fetchRelationships(AppSettings.contextEndpoint, iris)
    );
    const newIDs = initElements();
    queries.push(updateProjectElement(false, ...newIDs));
    queries.push(updateProjectLink(false, ...initConnections()));
    ids.push(...newIDs);
  }
  const elem = graph.getElements().find((elem) => elem.id === id);
  if (elem) {
    const length = ids.length + iris.length;
    const centerX = elem.position().x + elem.size().width / 2;
    const centerY = elem.position().y + elem.size().height / 2;
    const radius = 200 + length * 50;
    ids.forEach((id, i) => {
      const x = centerX + radius * Math.cos((i * 2 * Math.PI) / length);
      const y = centerY + radius * Math.sin((i * 2 * Math.PI) / length);
      let newElem = new graphElement({ id: id });
      newElem.position(x, y);
      WorkspaceElements[id].position[AppSettings.selectedDiagram] = {
        x: x,
        y: y,
      };
      WorkspaceElements[id].hidden[AppSettings.selectedDiagram] = false;
      newElem.addTo(graph);
      drawGraphElement(
        newElem,
        AppSettings.selectedLanguage,
        AppSettings.representation
      );
      queries.push(
        ...restoreHiddenElem(id, newElem, false, true, false),
        updateProjectElement(true, id),
        updateProjectElementDiagram(AppSettings.selectedDiagram, id)
      );
    });
    if (AppSettings.representation === Representation.COMPACT)
      setRepresentation(AppSettings.representation);
  }
  return queries;
}

export function setLabels(link: joint.dia.Link, centerLabel: string) {
  link.labels([]);
  if (WorkspaceLinks[link.id].type === LinkType.DEFAULT) {
    link.appendLabel({
      attrs: { text: { text: centerLabel } },
      position: { distance: 0.5 },
    });
    if (
      WorkspaceLinks[link.id].sourceCardinality &&
      WorkspaceLinks[link.id].sourceCardinality.getString() !== ""
    ) {
      link.appendLabel({
        attrs: {
          text: { text: WorkspaceLinks[link.id].sourceCardinality.getString() },
        },
        position: { distance: 20 },
      });
    }
    if (
      WorkspaceLinks[link.id].targetCardinality &&
      WorkspaceLinks[link.id].targetCardinality.getString() !== ""
    ) {
      link.appendLabel({
        attrs: {
          text: { text: WorkspaceLinks[link.id].targetCardinality.getString() },
        },
        position: { distance: -20 },
      });
    }
  }
}

function storeElement(elem: joint.dia.Cell) {
  WorkspaceElements[elem.id].hidden[AppSettings.selectedDiagram] = true;
  elem.remove();
  if (typeof elem.id === "string") {
    AppSettings.switchElements.push(elem.id);
  }
}

export function setRepresentation(
  representation: number,
  restoreFull: boolean = true
): {
  result: boolean;
  transaction: string[];
} {
  let queries: string[] = [];
  AppSettings.representation = representation;
  Diagrams[AppSettings.selectedDiagram].representation = representation;
  queries.push(
    updateProjectSettings(AppSettings.contextIRI, AppSettings.selectedDiagram)
  );
  AppSettings.selectedLink = "";
  let del = false;
  if (representation === Representation.COMPACT) {
    for (const id of Object.keys(WorkspaceElements)) {
      if (
        WorkspaceTerms[WorkspaceElements[id].iri].types.includes(
          parsePrefix("z-sgov-pojem", "typ-vztahu")
        )
      ) {
        let connections: string[] = getActiveToConnections(id);
        if (connections.length > 1) {
          const sourceLink: string | undefined = connections.find(
            (src) => WorkspaceLinks[src].iri === mvp1IRI
          );
          const targetLink: string | undefined = connections.find(
            (src) => WorkspaceLinks[src].iri === mvp2IRI
          );
          if (sourceLink && targetLink) {
            const source = WorkspaceLinks[sourceLink].target;
            const target = WorkspaceLinks[targetLink].target;
            const sourceBox = graph
              .getElements()
              .find((elem) => elem.id === source);
            const targetBox = graph
              .getElements()
              .find((elem) => elem.id === target);
            const find = Object.keys(WorkspaceLinks).find(
              (link) =>
                WorkspaceLinks[link].active &&
                WorkspaceLinks[link].iri === WorkspaceElements[id].iri &&
                WorkspaceLinks[link].source === source &&
                WorkspaceLinks[link].target === target
            );
            let newLink =
              typeof find === "string"
                ? getNewLink(LinkType.DEFAULT, find)
                : getNewLink();
            if (typeof newLink.id === "string" && sourceBox && targetBox) {
              newLink.source({
                id: source,
                connectionPoint: {
                  name: "boundary",
                  args: { selector: getElementShape(source) },
                },
              });
              newLink.target({
                id: target,
                connectionPoint: {
                  name: "boundary",
                  args: { selector: getElementShape(target) },
                },
              });
              newLink.addTo(graph);
              if (!(newLink.id in WorkspaceLinks))
                addLink(newLink.id, WorkspaceElements[id].iri, source, target);
              if (
                WorkspaceLinks[newLink.id].vertices[AppSettings.selectedDiagram]
              )
                newLink.vertices(
                  WorkspaceLinks[newLink.id].vertices[
                    AppSettings.selectedDiagram
                  ]
                );
              else if (source === target) {
                const coords = newLink.getSourcePoint();
                const bbox = sourceBox.getBBox();
                if (bbox) {
                  newLink.vertices([
                    new joint.g.Point(coords.x, coords.y + 100),
                    new joint.g.Point(
                      coords.x + bbox.width / 2 + 50,
                      coords.y + 100
                    ),
                    new joint.g.Point(coords.x + bbox.width / 2 + 50, coords.y),
                  ]);
                } else {
                  newLink.vertices([
                    new joint.g.Point(coords.x, coords.y + 100),
                    new joint.g.Point(coords.x + 300, coords.y + 100),
                    new joint.g.Point(coords.x + 300, coords.y),
                  ]);
                }
              }
              WorkspaceLinks[newLink.id].vertices[AppSettings.selectedDiagram] =
                newLink.vertices();
              if (!find) {
                WorkspaceLinks[newLink.id].sourceCardinality = new Cardinality(
                  WorkspaceLinks[
                    sourceLink
                  ].targetCardinality.getFirstCardinality(),
                  WorkspaceLinks[
                    sourceLink
                  ].targetCardinality.getSecondCardinality()
                );
                WorkspaceLinks[newLink.id].targetCardinality = new Cardinality(
                  WorkspaceLinks[
                    sourceLink
                  ].sourceCardinality.getFirstCardinality(),
                  WorkspaceLinks[
                    sourceLink
                  ].sourceCardinality.getSecondCardinality()
                );
                queries.push(updateProjectLink(false, newLink.id));
              }
              setLabels(
                newLink,
                WorkspaceElements[id].selectedLabel[
                  AppSettings.selectedLanguage
                ] ||
                  WorkspaceTerms[WorkspaceElements[id].iri].labels[
                    AppSettings.selectedLanguage
                  ]
              );
            }
          }
        }
        const cell = graph.getCell(id);
        if (cell) {
          storeElement(cell);
          del = true;
        }
      } else if (
        WorkspaceTerms[WorkspaceElements[id].iri].types.includes(
          parsePrefix("z-sgov-pojem", "typ-vlastnosti")
        )
      ) {
        const cell = graph.getCell(id);
        if (cell) {
          storeElement(cell);
          del = true;
        }
      }
    }
    for (const link of graph.getLinks()) {
      if (
        WorkspaceLinks[link.id].iri in Links &&
        Links[WorkspaceLinks[link.id].iri].type === LinkType.DEFAULT
      ) {
        link.remove();
        del = true;
      }
    }
    for (const elem of graph.getElements()) {
      drawGraphElement(
        elem,
        AppSettings.selectedLanguage,
        Representation.COMPACT
      );
    }
    return { result: del, transaction: queries };
  } else {
    for (const elem of AppSettings.switchElements) {
      if (WorkspaceElements[elem].position[AppSettings.selectedDiagram]) {
        const find = graph
          .getElements()
          .find(
            (cell) =>
              cell.id === elem &&
              WorkspaceElements[elem].active &&
              WorkspaceElements[elem].hidden[AppSettings.selectedDiagram]
          );
        let cell = find || new graphElement({ id: elem });
        cell.addTo(graph);
        cell.position(
          WorkspaceElements[elem].position[AppSettings.selectedDiagram].x,
          WorkspaceElements[elem].position[AppSettings.selectedDiagram].y
        );
        WorkspaceElements[elem].hidden[AppSettings.selectedDiagram] = false;
        drawGraphElement(cell, AppSettings.selectedLanguage, representation);
        queries.push(...restoreHiddenElem(elem, cell, false, false, false));
      }
    }
    for (let elem of graph.getElements()) {
      drawGraphElement(elem, AppSettings.selectedLanguage, representation);
      if (typeof elem.id === "string") {
        queries.push(
          ...restoreHiddenElem(elem.id, elem, true, restoreFull, false)
        );
      }
    }
    for (let link of graph.getLinks()) {
      if (
        !(WorkspaceLinks[link.id].iri in Links) ||
        !WorkspaceLinks[link.id].active
      ) {
        link.remove();
      }
    }
    AppSettings.switchElements = [];
    return { result: false, transaction: queries };
  }
}

export function findLinkSelfLoop(link: joint.dia.Link) {
  const id = link.id as string;
  if (
    WorkspaceLinks[id].source === WorkspaceLinks[id].target &&
    (!WorkspaceLinks[id].vertices[AppSettings.selectedDiagram] ||
      WorkspaceLinks[id].vertices[AppSettings.selectedDiagram].length === 0)
  ) {
    const coords = link.getSourcePoint();
    const bbox = link.getSourceCell()?.getBBox();
    if (bbox) {
      return [
        new joint.g.Point(coords.x, coords.y + 100),
        new joint.g.Point(coords.x + bbox.width / 2 + 50, coords.y + 100),
        new joint.g.Point(coords.x + bbox.width / 2 + 50, coords.y),
      ];
    } else {
      return [
        new joint.g.Point(coords.x, coords.y + 100),
        new joint.g.Point(coords.x + 300, coords.y + 100),
        new joint.g.Point(coords.x + 300, coords.y),
      ];
    }
  } else return [];
}

export function setupLink(
  link: string,
  restoreConnectionPosition: boolean = true
) {
  let lnk = getNewLink(WorkspaceLinks[link].type, link);
  setLabels(
    lnk,
    getLinkOrVocabElem(WorkspaceLinks[link].iri).labels[
      AppSettings.selectedLanguage
    ]
  );
  lnk.source({
    id: WorkspaceLinks[link].source,
    connectionPoint: {
      name: "boundary",
      args: { selector: getElementShape(WorkspaceLinks[link].source) },
    },
  });
  lnk.target({
    id: WorkspaceLinks[link].target,
    connectionPoint: {
      name: "boundary",
      args: { selector: getElementShape(WorkspaceLinks[link].target) },
    },
  });
  lnk.addTo(graph);
  if (!WorkspaceLinks[link].vertices[AppSettings.selectedDiagram])
    WorkspaceLinks[link].vertices[AppSettings.selectedDiagram] = [];
  if (restoreConnectionPosition) {
    lnk.vertices(
      WorkspaceLinks[link].vertices[AppSettings.selectedDiagram].length > 0
        ? WorkspaceLinks[link].vertices[AppSettings.selectedDiagram]
        : findLinkSelfLoop(lnk)
    );
    return undefined;
  } else {
    let ret = _.cloneDeep(
      WorkspaceLinks[link].vertices[AppSettings.selectedDiagram]
    );
    WorkspaceLinks[link].vertices[AppSettings.selectedDiagram] =
      findLinkSelfLoop(lnk);
    if (WorkspaceLinks[link].vertices[AppSettings.selectedDiagram].length > 0)
      lnk.vertices(WorkspaceLinks[link].vertices[AppSettings.selectedDiagram]);
    return ret ? ret.length : undefined;
  }
}

export function restoreHiddenElem(
  id: string,
  cls: joint.dia.Element,
  restoreSimpleConnectionPosition: boolean,
  restoreFull: boolean,
  restoreFullConnectionPosition: boolean
): string[] {
  let queries: string[] = [];
  if (!WorkspaceElements[id].diagrams.includes(AppSettings.selectedDiagram)) {
    WorkspaceElements[id].diagrams.push(AppSettings.selectedDiagram);
  }
  for (let link of Object.keys(WorkspaceLinks).filter(
    (link) => WorkspaceLinks[link].active
  )) {
    if (
      (WorkspaceLinks[link].source === id ||
        WorkspaceLinks[link].target === id) &&
      graph.getCell(WorkspaceLinks[link].source) &&
      graph.getCell(WorkspaceLinks[link].target) &&
      (AppSettings.representation === Representation.FULL
        ? WorkspaceLinks[link].iri in Links
        : !(WorkspaceLinks[link].iri in Links) ||
          (WorkspaceLinks[link].iri in Links &&
            Links[WorkspaceLinks[link].iri].inScheme.startsWith(
              AppSettings.ontographerContext
            )))
    ) {
      let oldPos = setupLink(link, restoreSimpleConnectionPosition);
      if (oldPos)
        queries.push(
          updateDeleteProjectLinkVertex(
            link,
            0,
            oldPos,
            AppSettings.selectedDiagram
          )
        );
    } else if (
      restoreFull &&
      AppSettings.representation === Representation.FULL &&
      WorkspaceLinks[link].target === id &&
      WorkspaceLinks[link].iri in Links &&
      graph.getCell(WorkspaceLinks[link].target)
    ) {
      let relID = WorkspaceLinks[link].source;
      for (let targetLink in WorkspaceLinks) {
        if (
          WorkspaceLinks[targetLink].active &&
          WorkspaceLinks[targetLink].source === relID &&
          WorkspaceLinks[targetLink].target !== id &&
          graph.getCell(WorkspaceLinks[targetLink].target)
        ) {
          let domainLink = getNewLink(WorkspaceLinks[link].type, link);
          let rangeLink = getNewLink(
            WorkspaceLinks[targetLink].type,
            targetLink
          );
          let existingRel = graph
            .getElements()
            .find((elem) => elem.id === relID);
          let relationship = existingRel
            ? existingRel
            : new graphElement({ id: relID });
          if (
            WorkspaceElements[relID].position[AppSettings.selectedDiagram] &&
            WorkspaceElements[relID].position[AppSettings.selectedDiagram].x !==
              0 &&
            WorkspaceElements[relID].position[AppSettings.selectedDiagram].y !==
              0 &&
            restoreFullConnectionPosition
          ) {
            relationship.position(
              WorkspaceElements[relID].position[AppSettings.selectedDiagram].x,
              WorkspaceElements[relID].position[AppSettings.selectedDiagram].y
            );
          } else {
            const sourcepos = graph
              .getCell(WorkspaceLinks[link].target)
              .get("position");
            const targetpos = graph
              .getCell(WorkspaceLinks[targetLink].target)
              .get("position");
            const posx = (sourcepos.x + targetpos.x) / 2;
            const posy = (sourcepos.y + targetpos.y) / 2;
            relationship.position(posx, posy);
          }
          WorkspaceElements[relID].position[AppSettings.selectedDiagram] =
            relationship.position();
          WorkspaceElements[relID].hidden[AppSettings.selectedDiagram] = false;
          drawGraphElement(
            relationship,
            AppSettings.selectedLanguage,
            Representation.FULL
          );
          domainLink.source({
            id: relID,
            connectionPoint: {
              name: "boundary",
              args: { selector: getElementShape(relID) },
            },
          });
          domainLink.target({
            id: WorkspaceLinks[link].target,
            connectionPoint: {
              name: "boundary",
              args: { selector: getElementShape(WorkspaceLinks[link].target) },
            },
          });
          rangeLink.source({
            id: relID,
            connectionPoint: {
              name: "boundary",
              args: { selector: getElementShape(relID) },
            },
          });
          rangeLink.target({
            id: WorkspaceLinks[targetLink].target,
            connectionPoint: {
              name: "boundary",
              args: {
                selector: getElementShape(WorkspaceLinks[targetLink].target),
              },
            },
          });
          setLabels(
            domainLink,
            getLinkOrVocabElem(WorkspaceLinks[link].iri).labels[
              AppSettings.selectedLanguage
            ]
          );
          setLabels(
            rangeLink,
            getLinkOrVocabElem(WorkspaceLinks[targetLink].iri).labels[
              AppSettings.selectedLanguage
            ]
          );
          relationship.addTo(graph);
          queries.push(
            updateProjectElementDiagram(AppSettings.selectedDiagram, relID)
          );
          if (restoreFullConnectionPosition) {
            domainLink.vertices(
              WorkspaceLinks[link].vertices[AppSettings.selectedDiagram]
            );
            rangeLink.vertices(
              WorkspaceLinks[targetLink].vertices[AppSettings.selectedDiagram]
            );
          } else {
            queries.push(updateProjectElement(true, relID));
            if (WorkspaceLinks[link].vertices[AppSettings.selectedDiagram])
              queries.push(
                updateDeleteProjectLinkVertex(
                  link,
                  0,
                  WorkspaceLinks[link].vertices[AppSettings.selectedDiagram]
                    .length,
                  AppSettings.selectedDiagram
                )
              );
            if (
              WorkspaceLinks[targetLink].vertices[AppSettings.selectedDiagram]
            )
              queries.push(
                updateDeleteProjectLinkVertex(
                  targetLink,
                  0,
                  WorkspaceLinks[targetLink].vertices[
                    AppSettings.selectedDiagram
                  ].length,
                  AppSettings.selectedDiagram
                )
              );
            WorkspaceLinks[link].vertices[AppSettings.selectedDiagram] = [];
            WorkspaceLinks[targetLink].vertices[AppSettings.selectedDiagram] =
              [];
          }
          domainLink.addTo(graph);
          rangeLink.addTo(graph);
          break;
        }
      }
    }
  }
  return queries;
}
