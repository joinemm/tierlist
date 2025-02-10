import {
  closestCenter,
  DragEventHandler,
  Draggable,
  Droppable,
  Id,
  CollisionDetector,
  DragDropProvider,
  DragDropSensors,
  SortableProvider,
  DragOverlay,
  createSortable,
  maybeTransformStyle,
} from "@thisbeyond/solid-dnd";
import Big from "big.js";
import { batch, onMount, For, createSignal, Show, JSX } from "solid-js";
import {
  createStore,
  produce,
  reconcile,
  SetStoreFunction,
} from "solid-js/store";
import * as htmlToImage from "html-to-image";
import download from "downloadjs";
import { tippy, TippyOptions } from "solid-tippy";
import { Portal } from "solid-js/web";
import { TierForm, ItemForm } from "./Form";
import { FiPlusSquare } from "solid-icons/fi";
import { unwrap } from "solid-js/store";
import { createUniqueId } from "solid-js";
import { RiMediaImageAddFill } from "solid-icons/ri";
import { BiSolidEdit } from "solid-icons/bi";
import { ImUndo2 } from "solid-icons/im";
import { TbDownload, TbFileDownload, TbFileUpload } from "solid-icons/tb";
import { IconTypes } from "solid-icons";
tippy;

export type Tier = {
  id: Id;
  name: string;
  color: string;
  type: string;
  order: string;
};

export type Item = {
  id: Id;
  name: string;
  image_url: string;
  tier: Id;
  type: string;
  order: string;
};

type State = {
  tiers: Tier[];
  items: Item[];
};

declare module "solid-js" {
  namespace JSX {
    interface Directives {
      sortable: any;
      tippy: TippyOptions;
    }
  }
}

const UNSORTED_ID = "unsorted";

const SideButton = (props: {
  onClick: JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent>;
  icon: IconTypes;
  title: string;
}) => {
  return (
    <button
      class="bg-gray-900 rounded-md hover:bg-gray-700 w-12 h-12 text-white"
      onClick={props.onClick}
      use:tippy={{
        props: {
          content: props.title,
          duration: 0,
          placement: "right",
        },
        hidden: true,
      }}
    >
      <props.icon size={30} class="m-auto" />
    </button>
  );
};

const ImportButton = (props: { importer: Function }) => {
  const { Modal, setModalOpen } = createModal();
  const [file, setFile] = createSignal(null);

  const handleChange = (e) => {
    const fileReader = new FileReader();
    fileReader.readAsText(e.target.files[0], "UTF-8");
    fileReader.onload = (e) => {
      setFile(e.target.result);
    };
  };

  return (
    <>
      <SideButton
        title="Import"
        icon={TbFileDownload}
        onClick={() => setModalOpen(true)}
      />
      <Modal>
        <div class="bg-black rounded-xl p-8 justify-center text-white">
          <div class="flex flex-col gap-4 max-w-80">
            <p>this doesn't actually restore the images yet</p>
            <input type="file" onChange={handleChange} />
            <button
              class="bg-blue-800 p-1 rounded-m font-bold"
              type="submit"
              onClick={() => {
                props.importer(JSON.parse(file()));
                setModalOpen(false);
              }}
            >
              Import
            </button>
            <button
              class="bg-red-800 p-1 rounded-m font-bold"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

const TierComponent = (props: {
  tier: Tier;
  items: Item[];
  state: State;
  setState: SetStoreFunction<State>;
}) => {
  const sortable = createSortable(props.tier.id, props.tier);
  const { Modal, setModalOpen } = createModal();

  return (
    <>
      <div
        ref={sortable.ref}
        style={maybeTransformStyle(sortable.transform)}
        classList={{ "opacity-50": sortable.isActiveDraggable }}
        class="sortable flex"
      >
        <div
          {...sortable.dragActivators}
          class="group w-24 h-full min-h-24 flex flex-shrink-0 relative cursor-grab border-black border-[1px] box-border"
          style={`background-color: ${props.tier.color}`}
          onDblClick={() => setModalOpen(true)}
        >
          <p class="text-center text-md justify-center align-middle m-auto text-wrap font-bold select-none">
            {props.tier.name}
          </p>
          <button
            class="hidden group-hover:block absolute bottom-1 left-1"
            onClick={() => setModalOpen(true)}
          >
            <BiSolidEdit color="white" size={25} />
          </button>
        </div>
        <div class="bg-gray-900 flex flex-wrap w-full outline outline-2 ">
          <SortableProvider ids={props.items.map((item) => item.id)}>
            <For each={props.items}>
              {(item) => (
                <ItemComponent
                  item={item}
                  state={props.state}
                  setState={props.setState}
                />
              )}
            </For>
          </SortableProvider>
        </div>
      </div>
      <Modal>
        <TierForm
          tier={props.tier}
          onSubmit={(data: Tier) => {
            props.setState(
              "tiers",
              (tiers) => tiers.id == props.tier.id,
              produce((tier: Tier) => {
                tier.name = data.name;
                tier.color = data.color;
              }),
            );
            setModalOpen(false);
          }}
          onDelete={() =>
            batch(() => {
              props.setState(
                "tiers",
                props.state.tiers.filter(
                  (tier: Tier) => tier.id !== props.tier.id,
                ),
              );
              props.setState(
                "items",
                props.state.items.map((item: Item) => {
                  if (item.tier === props.tier.id) {
                    return { ...item, tier: UNSORTED_ID };
                  } else {
                    return item;
                  }
                }),
              );
            })
          }
        />
      </Modal>
    </>
  );
};

const TierOverlay = (props: { tier: Tier; items: Item[] }) => {
  return (
    <>
      <div class="flex box-content w-full border-black border-[1px]">
        <div
          class="w-24 h-full min-h-24 flex flex-shrink-0 relative cursor-grabbing border-black border-[1px]"
          style={`background-color: ${props.tier.color}`}
        >
          <p class="text-center text-wrap text-md justify-center align-middle m-auto font-bold">
            {props.tier.name}
          </p>
        </div>
        <div class="bg-gray-900 flex flex-wrap w-full">
          <For each={props.items}>{(item) => <ItemOverlay item={item} />}</For>
        </div>
      </div>
    </>
  );
};

const ItemComponent = (props: {
  item: Item;
  state: State;
  setState: SetStoreFunction<State>;
}) => {
  const sortable = createSortable(props.item.id, props.item);
  const { Modal, setModalOpen } = createModal();

  return (
    <>
      <div
        use:sortable
        classList={{ "opacity-50": sortable.isActiveDraggable }}
        class="w-24 h-24 bg-cover bg-center cursor-grab relative group bg-gray-300 border-black border-[1px]"
        style={`background-image: url('${props.item.image_url}')`}
        use:tippy={{
          props: {
            content: props.item.name,
            duration: 0,
            offset: [0, -10],
          },
          hidden: true,
          disabled: props.item.name.length === 0,
        }}
        onDblClick={() => setModalOpen(true)}
      >
        <button
          class="hidden group-hover:block absolute bottom-1 left-1"
          onClick={() => setModalOpen(true)}
        >
          <BiSolidEdit color="white" size={25} />
        </button>
      </div>
      <Modal>
        <ItemForm
          item={props.item}
          onSubmit={(data: Item) => {
            props.setState(
              "items",
              (items) => items.id == props.item.id,
              produce((item: Item) => {
                item.name = data.name;
                item.image_url = data.image_url;
              }),
            );
            setModalOpen(false);
          }}
          onDelete={() =>
            props.setState(
              "items",
              props.state.items.filter(
                (item: Item) => item.id !== props.item.id,
              ),
            )
          }
        />
      </Modal>
    </>
  );
};

const ItemOverlay = (props: { item: Item }) => {
  return (
    <>
      <div
        class="w-24 h-24 bg-cover bg-center cursor-grabbing bg-gray-300 border-black border-[1px]"
        style={`background-image: url('${props.item.image_url}')`}
      ></div>
    </>
  );
};

const UnsortedContainer = (props: {
  items: Item[];
  state: State;
  setState: SetStoreFunction<State>;
  onNewItem: Function;
}) => {
  const sortable = createSortable(UNSORTED_ID, { type: "tier" });
  const { Modal, setModalOpen } = createModal();

  return (
    <>
      <div
        ref={sortable.ref}
        class="outline-8 outline-black outline bg-gray-900 w-[12rem]"
        classList={{
          "w-[18rem]": props.items.length >= 2 * (props.state.tiers.length - 1),
        }}
      >
        <div class="flex flex-wrap w-full">
          <SortableProvider ids={props.items.map((item) => item.id)}>
            <For each={props.items}>
              {(item) => (
                <ItemComponent
                  item={item}
                  state={props.state}
                  setState={props.setState}
                />
              )}
            </For>
          </SortableProvider>
          <button
            class="h-24 w-24 text-white hover:text-green-400"
            onClick={() => setModalOpen(true)}
          >
            <RiMediaImageAddFill size={40} class="m-auto" />
          </button>
        </div>
      </div>
      <Modal>
        <ItemForm
          item={null}
          onSubmit={(data: Item) => {
            props.onNewItem(data.name, data.image_url);
            setModalOpen(false);
          }}
          onDelete={() => setModalOpen(false)}
          deleteText="Cancel"
        />
      </Modal>
    </>
  );
};

const NewTierButton = (props: { onNewTier: Function }) => {
  const { Modal, setModalOpen } = createModal();

  return (
    <>
      <button
        class="h-20 w-28 text-white absolute hover:text-green-400"
        onClick={() => setModalOpen(true)}
      >
        <FiPlusSquare size={40} class="m-auto" />
      </button>
      <Modal>
        <TierForm
          tier={null}
          onSubmit={(data: Tier) => {
            props.onNewTier(data.name, data.color);
            setModalOpen(false);
          }}
          onDelete={() => setModalOpen(false)}
          deleteText="Cancel"
        />
      </Modal>
    </>
  );
};

const createModal = () => {
  const [open, setModalOpen] = createSignal(false);

  return {
    setModalOpen,
    Modal(props: any) {
      return (
        <Portal>
          <Show when={open()}>
            <div class="absolute inset-0 flex justify-center w-screen h-screen bg-opacity-50 bg-black items-center">
              {props.children}
            </div>
          </Show>
        </Portal>
      );
    },
  };
};

export const TierList = () => {
  const [state, setState] = createStore<State>({
    tiers: [],
    items: [],
  });

  const ORDER_DELTA = 1000;
  let nextOrder = 0;

  const getNextOrder = () => {
    nextOrder += ORDER_DELTA;
    return nextOrder.toString();
  };

  const sortByOrder = (entities: Tier[] | Item[]) => {
    const sorted = entities.map((x: Tier | Item) => ({
      order: new Big(x.order),
      x,
    }));
    sorted.sort((a, b) => a.order.cmp(b.order));
    return sorted.map((entry) => entry.x);
  };

  const newTier = (name: string, color: string): Id => {
    const id = createUniqueId();
    setState("tiers", state.tiers.length, {
      id: id,
      name,
      color,
      type: "tier",
      order: getNextOrder(),
    });
    return id;
  };

  const newItem = (name: string, image_url: string, tier?: Id) => {
    setState("items", state.items.length, {
      id: createUniqueId(),
      name,
      image_url,
      tier: tier ?? UNSORTED_ID,
      type: "item",
      order: getNextOrder(),
    });
  };

  onMount(() => {
    batch(() => {
      initUnsorted();
      newTier("S", "#ff7f7e");
      newTier("A", "#ffbf7d");
      newTier("B", "#fefe82");
      newTier("C", "#7dff7e");
      newTier("D", "#7fbfff");
    });
  });

  const initUnsorted = () => {
    setState("tiers", state.tiers.length, {
      id: UNSORTED_ID,
      name: "Unsorted",
      color: "#000000",
      type: "tier",
      order: Number.MAX_SAFE_INTEGER.toString(),
    });
  };

  const move = (
    draggable: Draggable,
    droppable: Droppable,
    onlyWhenChangingGroup = true,
  ) => {
    if (!draggable || !droppable) return;

    const draggableIsTier = draggable.data.type === "tier";
    const droppableIsTier = droppable.data.type === "tier";

    const draggableTierId = draggableIsTier
      ? draggable.id
      : draggable.data.tier;

    const droppableTierId = droppableIsTier
      ? droppable.id
      : droppable.data.tier;

    if (
      onlyWhenChangingGroup &&
      (draggableIsTier || draggableTierId === droppableTierId)
    ) {
      return;
    }

    const tiers = sortByOrder(state.tiers) as Tier[];
    const items = sortByOrder(state.items) as Item[];

    let ids = draggableIsTier
      ? tiers.map((tier) => tier.id)
      : items
          .filter((item) => item.tier == droppableTierId)
          .map((item) => item.id);

    let orders = draggableIsTier
      ? tiers.map((tier) => tier.order)
      : items
          .filter((item) => item.tier == droppableTierId)
          .map((item) => item.order);

    let order: Big;

    if (droppableIsTier && !draggableIsTier) {
      order = new Big(orders.at(-1) ?? -ORDER_DELTA).plus(ORDER_DELTA).round();
    } else {
      const draggableIndex = ids.indexOf(draggable.id);
      const droppableIndex = ids.indexOf(droppable.id);
      if (draggableIndex !== droppableIndex) {
        let orderAfter: Big, orderBefore: Big;
        if (draggableIndex === -1 || draggableIndex > droppableIndex) {
          orderBefore = new Big(orders[droppableIndex]);
          orderAfter = new Big(
            orders[droppableIndex - 1] ?? orderBefore.minus(ORDER_DELTA * 2),
          );
        } else {
          orderAfter = new Big(orders[droppableIndex]);
          orderBefore = new Big(
            orders[droppableIndex + 1] ?? orderAfter.plus(ORDER_DELTA * 2),
          );
        }

        if (orderAfter !== undefined && orderBefore !== undefined) {
          order = orderAfter.plus(orderBefore).div(2.0);
          const rounded = order.round();
          if (rounded.gt(orderAfter) && rounded.lt(orderBefore)) {
            order = rounded;
          }
        }
      }
    }

    if (order !== undefined) {
      if (draggableIsTier) {
        setState(
          "tiers",
          (tier) => tier.id === draggable.id,
          produce((x: Tier) => {
            x.order = order.toString();
          }),
        );
      } else {
        setState(
          "items",
          (item) => item.id === draggable.id,
          produce((x: Item) => {
            x.order = order.toString();
            x.tier = droppableTierId;
          }),
        );
      }
    }
  };

  const closestEntity: CollisionDetector = (draggable, droppables, context) => {
    if (draggable.data.type === "tier") {
      return closestCenter(
        draggable,
        droppables.filter(
          (droppable) =>
            droppable.data.type === "tier" && droppable.id !== UNSORTED_ID,
        ),
        context,
      );
    } else {
      const closestTier = closestCenter(
        draggable,
        droppables.filter((droppable) => droppable.data.type === "tier"),
        context,
      );

      const closestItem = closestCenter(
        draggable,
        droppables.filter(
          (droppable) =>
            droppable.data.type !== "group" &&
            droppable.data.tier === closestTier.id,
        ),
        context,
      );

      if (!closestItem) {
        return closestTier;
      }

      const changingTier = draggable.data.tier !== closestTier.id;
      if (changingTier) {
        const items = sortByOrder(state.items) as Item[];
        const afterLastItem =
          items
            .filter((item) => item.tier == closestTier.id)
            .map((item) => item.id)
            .at(-1) === closestItem.id &&
          draggable.transformed.center.x > closestItem.transformed.center.x;

        if (afterLastItem) return closestTier;
      }

      return closestItem;
    }
  };

  const onDragOver: DragEventHandler = ({ draggable, droppable }) =>
    move(draggable, droppable);

  const onDragEnd: DragEventHandler = ({ draggable, droppable }) =>
    move(draggable, droppable, false);

  const screenshot = () => {
    const node = document.getElementById("screenshot");
    const scale = 3;
    const style = {
      transform: "scale(" + scale + ")",
      "transform-origin": "top left",
      width: node.offsetWidth + "px",
      height: node.offsetHeight + "px",
    };

    const param = {
      height: node.offsetHeight * scale,
      width: node.offsetWidth * scale,
      style,
    };

    htmlToImage
      .toPng(node, param)
      .then(function (dataUrl) {
        download(dataUrl, "tierlist.png");
      })
      .catch(function (error) {
        console.error("oops, something went wrong!", error);
      });
  };

  const exportData = () => {
    let data = unwrap(state);
    let exportedData = {
      tiers: data.tiers.filter((tier) => tier.id !== UNSORTED_ID),
      items: data.items,
    };
    download(JSON.stringify(exportedData), "tierlist_export.json");
  };

  const importData = (data: State) => {
    batch(() => {
      setState("tiers", []);
      setState("items", []);
      initUnsorted();
      setState("tiers", reconcile([...data.tiers]));
      setState("items", reconcile([...data.items]));
    });
  };

  window.onbeforeunload = function () {
    if (state.items.length > 0) {
      return "unsaved changes!";
    }
  };

  return (
    <div class="flex flex-col flex-1 self-stretch m-auto items-center max-w-screen-xl h-dvh">
      <h1 class="text-4xl text-white my-8">Tierlist Maker</h1>
      <DragDropProvider
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        collisionDetector={closestEntity}
      >
        <DragDropSensors />

        <SortableProvider ids={sortByOrder(state.tiers).map((tier) => tier.id)}>
          <div class="flex gap-6 mb-16">
            <UnsortedContainer
              items={(sortByOrder(state.items) as Item[]).filter(
                (item) => item.tier === UNSORTED_ID,
              )}
              state={state}
              setState={setState}
              onNewItem={newItem}
            />
            <div>
              <div
                id="screenshot"
                class="grid grid-flow-row outline-8 outline-black outline max-w-[48rem] min-w-[30rem] ml-2"
              >
                <For
                  each={
                    sortByOrder(state.tiers).filter(
                      (tier) => tier.id !== UNSORTED_ID,
                    ) as Tier[]
                  }
                >
                  {(tier) => (
                    <TierComponent
                      tier={tier}
                      items={(sortByOrder(state.items) as Item[]).filter(
                        (item) => item.tier == tier.id,
                      )}
                      state={state}
                      setState={setState}
                    />
                  )}
                </For>
              </div>
              <NewTierButton onNewTier={newTier} />
            </div>

            <div class="flex-col flex gap-4 w-12">
              <SideButton
                title="Unsort all"
                icon={ImUndo2}
                onClick={() =>
                  setState(
                    "items",
                    (_) => true,
                    produce((item: Item) => {
                      item.tier = UNSORTED_ID;
                    }),
                  )
                }
              />
              <SideButton
                title="Download"
                icon={TbDownload}
                onClick={screenshot}
              />
              <SideButton
                title="Export"
                icon={TbFileUpload}
                onClick={exportData}
              />
              <ImportButton importer={importData} />
            </div>
          </div>
        </SortableProvider>

        <DragOverlay>
          {(draggable) => {
            return draggable.data.type === "tier" ? (
              <TierOverlay
                tier={state.tiers.find((tier) => tier.id === draggable.id)}
                items={(sortByOrder(state.items) as Item[]).filter(
                  (item) => item.tier == draggable.id,
                )}
              />
            ) : (
              <ItemOverlay
                item={state.items.find((tier) => tier.id === draggable.id)}
              />
            );
          }}
        </DragOverlay>
      </DragDropProvider>
      <footer class="mt-auto text-white mb-4 font-mono">
        © 2025 Joinemm -{" "}
        <a class="underline" href="https://github.com/joinemm/tierlist">
          Source code
        </a>
      </footer>
    </div>
  );
};
