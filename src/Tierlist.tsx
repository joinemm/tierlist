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
import { batch, onMount, For, createSignal, Show, JSX, VoidComponent } from "solid-js";
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
import { RiMediaImageAddFill } from "solid-icons/ri";
import { ImUndo2 } from "solid-icons/im";
import {
  TbDownload,
  TbEdit,
  TbFileDownload,
  TbFileUpload,
  TbPhotoEdit,
  TbTags,
} from "solid-icons/tb";
import { IconTypes } from "solid-icons";
import { v4 as uuidv4 } from 'uuid';

// "use" this import because typescript doesn't see the directive
0 && tippy;

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
  image_url: string | null;
  tier: Id;
  type: string;
  order: string;
};

export type Settings = {
  showLabels: boolean;
};

type State = {
  tiers: Tier[];
  items: Item[];
  settings: Settings;
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

const SideButton: VoidComponent<{
  onClick: JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent>;
  icon: IconTypes;
  title: string;
}> = (props) => {
  return (
    <button
      class="bg-zinc-800 rounded-md hover:bg-zinc-600 w-12 h-12 text-white"
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

const ImportButton: VoidComponent<{ importer: (data: State) => void }> = (props) => {
  const { Modal, setModalOpen } = createModal();
  const [file, setFile] = createSignal(null);

  const handleChange: JSX.ChangeEventHandlerUnion<HTMLInputElement, InputEvent> = (e) => {
    const fileReader = new FileReader();
    fileReader.readAsText(e.currentTarget.files[0], "UTF-8");
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

const TierComponent: VoidComponent<{
  tier: Tier;
  items: Item[];
  state: State;
  setState: SetStoreFunction<State>;
}> = (props) => {
  const sortable = createSortable(props.tier.id, props.tier);
  const { Modal, setModalOpen } = createModal();

  const handleSubmit = (data: Tier) => {
    props.setState(
      "tiers",
      (tiers) => tiers.id == props.tier.id,
      produce((tier: Tier) => {
        tier.name = data.name;
        tier.color = data.color;
      }),
    );
    setModalOpen(false);
  }

  const handleDelete = () => {
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

  return (
    <>
      <div
        ref={sortable.ref}
        style={maybeTransformStyle(sortable.transform)}
        classList={{ "opacity-50": sortable.isActiveDraggable }}
        class="flex"
      >
        <div
          {...sortable.dragActivators}
          class="group w-24 h-full min-h-24 flex flex-shrink-0 relative cursor-grab"
          style={`background-color: ${props.tier.color}`}
          onDblClick={() => setModalOpen(true)}
        >
          <p class="text-center text-wrap text-md justify-center align-middle m-auto font-bold select-none">
            {props.tier.name}
          </p>
          <button
            class="hidden group-hover:block absolute top-0 left-0"
            onClick={() => setModalOpen(true)}
          >
            <TbEdit color="white" size={25} class="drop-shadow" />
          </button>
        </div>
        <div class="bg-zinc-900 flex flex-wrap w-full outline outline-2">
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
          onSubmit={handleSubmit}
          onDelete={handleDelete}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>
    </>
  );
};

const TierOverlay: VoidComponent<{ tier: Tier; items: Item[]; state: State }> = (props) => {
  return (
    <div class="flex box-content w-full outline outline-2">
      <div
        class="w-24 h-full min-h-24 flex flex-shrink-0 relative cursor-grabbing"
        style={`background-color: ${props.tier.color}`}
      >
        <p class="text-center text-wrap text-md justify-center align-middle m-auto font-bold select-none">
          {props.tier.name}
        </p>
      </div>
      <div class="bg-zinc-900 flex flex-wrap w-full">
        <For each={props.items}>
          {(item) => <ItemOverlay item={item} state={props.state} />}
        </For>
      </div>
    </div>
  );
};

const ItemComponent: VoidComponent<{
  item: Item;
  state: State;
  setState: SetStoreFunction<State>;
}> = (props) => {
  const sortable = createSortable(props.item.id, props.item);
  const { Modal, setModalOpen } = createModal();

  const handleSubmit = (data: Item) => {
    props.setState(
      "items",
      (items) => items.id == props.item.id,
      produce((item: Item) => {
        item.name = data.name;
        item.image_url = data.image_url;
      }),
    );
    setModalOpen(false);
  }

  const handleDelete = () =>
    props.setState(
      "items",
      props.state.items.filter(
        (item: Item) => item.id !== props.item.id,
      ),
    )

  return (
    <>
      <div
        use:sortable
        classList={{ "opacity-50": sortable.isActiveDraggable }}
        class="w-24 h-24 bg-cover bg-center cursor-grab relative group border-black border-[1px] overflow-hidden rounded-md"
        style={`background-image: url('${props.item.image_url ?? "https://placehold.co/96?text=no+image"}')`}
        use:tippy={{
          props: {
            content: props.item.name,
            duration: 0,
            offset: [0, -5],
          },
          hidden: true,
          disabled:
            props.state.settings.showLabels || props.item.name.length === 0,
        }}
        onDblClick={() => setModalOpen(true)}
      >
        <button
          class="hidden group-hover:block absolute top-0 left-0"
          onClick={() => setModalOpen(true)}
        >
          <TbPhotoEdit color="white" size={25} class="drop-shadow" />
        </button>
        <Show when={props.state.settings.showLabels}>
          <div class="absolute w-full bg-zinc-950 bottom-0 text-white text-center leading-5 text-sm">
            {props.item.name}
          </div>
        </Show>
      </div>
      <Modal>
        <ItemForm
          item={props.item}
          onSubmit={handleSubmit}
          onDelete={handleDelete}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>
    </>
  );
};

const ItemOverlay = (props: { item: Item; state: State }) => {
  return (
    <div
      class="w-24 h-24 bg-cover bg-center cursor-grabbing relative border-black border-[1px] overflow-hidden rounded-md"
      style={`background-image: url('${props.item.image_url ?? "https://placehold.co/96?text=no+image"}')`}
    >
      <Show when={props.state.settings.showLabels}>
        <div class="absolute w-full bg-zinc-950 bottom-0 text-white text-center leading-5 text-sm">
          {props.item.name}
        </div>
      </Show>
    </div>
  );
};

const UnsortedContainer: VoidComponent<{
  items: Item[];
  state: State;
  setState: SetStoreFunction<State>;
  onNewItem: (name: string, image_url: string) => void;
}> = (props) => {
  const sortable = createSortable(UNSORTED_ID, { type: "tier" });
  const { Modal, setModalOpen } = createModal();

  const handleSubmit = (data: Item) => {
    props.onNewItem(data.name, data.image_url);
    setModalOpen(false);
  }

  return (
    <>
      <div
        ref={sortable.ref}
        class="outline-8 outline-black outline bg-zinc-900 w-[12rem] m-2 rounded-md"
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
          onSubmit={handleSubmit}
          onDelete={null}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>
    </>
  );
};

const NewTierButton: VoidComponent<{ onNewTier: (name: string, color: string) => void }> = (props) => {
  const { Modal, setModalOpen } = createModal();

  const handleSubmit = (data: Tier) => {
    props.onNewTier(data.name, data.color);
    setModalOpen(false);
  }

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
          onSubmit={handleSubmit}
          onDelete={null}
          onCancel={() => setModalOpen(false)}
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

export const TierList: VoidComponent = () => {
  const [state, setState] = createStore<State>({
    tiers: [],
    items: [],
    settings: { showLabels: true },
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
    const id = uuidv4();
    setState("tiers", state.tiers.length, {
      id: id,
      name,
      color,
      type: "tier",
      order: getNextOrder(),
    });
    return id;
  };

  const newItem = (name: string, image_url: string | null, tier?: Id) => {
    setState("items", state.items.length, {
      id: uuidv4(),
      name,
      image_url,
      tier: tier ?? UNSORTED_ID,
      type: "item",
      order: getNextOrder(),
    });
  };

  const initUnsorted = () => {
    setState("tiers", state.tiers.length, {
      id: UNSORTED_ID,
      name: "Unsorted",
      color: "#000000",
      type: "tier",
      order: Number.MAX_SAFE_INTEGER.toString(),
    });
  };

  onMount(() => {
    batch(() => {
      initUnsorted();
      const a = newTier("S", "#ff7f7e");
      newTier("A", "#ffbf7d");
      newTier("B", "#fefe82");
      newTier("C", "#7dff7e");
      newTier("D", "#7fbfff");
    });
  });

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

    let ids = draggableIsTier
      ? sortedTiers().map((tier) => tier.id)
      : sortedItems()
        .filter((item) => item.tier == droppableTierId)
        .map((item) => item.id);

    let orders = draggableIsTier
      ? sortedTiers().map((tier) => tier.order)
      : sortedItems()
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
        const afterLastItem =
          sortedItems()
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

  const handleScreenshot = () => {
    const node = document.getElementById("screenshot");

    // Scale everything by 3 to get a crisp image
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
      .then((dataUrl) => download(dataUrl, "tierlist.png"))
      .catch((error) => console.error("oops, something went wrong!", error));
  };

  const handleExport = () => {
    const data = unwrap(state);
    const exportedData = {
      tiers: data.tiers.filter((tier) => tier.id !== UNSORTED_ID),
      items: data.items,
    };
    download(JSON.stringify(exportedData), "tierlist_export.json");
  };

  const handleImport = (data: State) => {
    batch(() => {
      setState("tiers", []);
      setState("items", []);
      initUnsorted();
    })

    batch(() => {
      setState("tiers", reconcile([...data.tiers]));
      setState("items", reconcile([...data.items]));
    });
  };

  const handleUnsort = () => {
    setState(
      "items",
      (item) => item.tier !== UNSORTED_ID,
      produce((item: Item) => {
        item.tier = UNSORTED_ID;
      }),
    )
  }

  window.onbeforeunload = () => {
    if (state.items.length > 0) {
      // pops up the "confirm leaving page" dialog
      // but this custom text isn't shown anywhere
      return "unsaved changes!";
    }
  };

  const sortedItems = () => sortByOrder(state.items) as Item[]
  const sortedTiers = () => sortByOrder(state.tiers) as Tier[]
  const itemsInTier = (id: Id) => sortedItems().filter((item) => item.tier == id)

  return (
    <div class="flex flex-col flex-1 self-stretch m-auto items-center max-w-screen-xl h-dvh">
      <h1 class="text-4xl text-white my-8 font-mono">Tierlist Maker</h1>
      <DragDropProvider
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        collisionDetector={closestEntity}
      >
        <DragDropSensors />

        <SortableProvider ids={sortedTiers().map((tier) => tier.id)}>
          <div class="flex gap-4 mb-16">
            <UnsortedContainer
              items={itemsInTier(UNSORTED_ID)}
              state={state}
              setState={setState}
              onNewItem={newItem}
            />
            <div>
              <div id="screenshot" class="p-2">
                <div class="grid grid-flow-row outline-8 outline-black outline max-w-[48rem] min-w-[30rem] rounded-md overflow-hidden">
                  <For
                    each={sortedTiers().filter((tier) => tier.id !== UNSORTED_ID)}
                  >
                    {(tier) => (
                      <TierComponent
                        tier={tier}
                        items={itemsInTier(tier.id)}
                        state={state}
                        setState={setState}
                      />
                    )}
                  </For>
                </div>
              </div>
              <NewTierButton onNewTier={newTier} />
            </div>

            <div class="flex-col flex gap-4 w-12 mt-2">
              <SideButton
                title="Unsort all"
                icon={ImUndo2}
                onClick={handleUnsort}
              />
              <SideButton
                title="Toggle labels"
                icon={TbTags}
                onClick={() =>
                  setState(
                    produce(
                      (state: State) =>
                      (state.settings.showLabels =
                        !state.settings.showLabels),
                    ),
                  )
                }
              />
              <SideButton
                title="Download"
                icon={TbDownload}
                onClick={handleScreenshot}
              />
              <SideButton
                title="Export"
                icon={TbFileUpload}
                onClick={handleExport}
              />
              <ImportButton importer={handleImport} />
            </div>
          </div>
        </SortableProvider>

        <DragOverlay>
          {(draggable) => {
            return draggable.data.type === "tier" ? (
              <TierOverlay
                tier={state.tiers.find((tier) => tier.id === draggable.id)}
                items={itemsInTier(draggable.id)}
                state={state}
              />
            ) : (
              <ItemOverlay
                item={state.items.find((tier) => tier.id === draggable.id)}
                state={state}
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
