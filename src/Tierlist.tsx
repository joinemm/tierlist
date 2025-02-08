import {
  DragDropProvider,
  DragDropSensors,
  DragOverlay,
  SortableProvider,
  createSortable,
  closestCenter,
  maybeTransformStyle,
  Id,
  DragEventHandler,
  Draggable,
  Droppable,
  CollisionDetector,
} from "@thisbeyond/solid-dnd";
import {
  batch,
  createSignal,
  For,
  onMount,
  VoidComponent,
  Show,
} from "solid-js";
import { createStore } from "solid-js/store";
import Big from "big.js";
import { TippyOptions } from "solid-tippy";
import { tippy } from "solid-tippy";
import { GroupForm, ItemForm } from "./Form";

import { Portal } from "solid-js/web";


tippy;

declare module "solid-js" {
  namespace JSX {
    interface Directives {
      tippy: TippyOptions;
    }
  }
}

export const ORDER_DELTA = 1000;

interface Base {
  id: Id;
  name: string;
  type: "group" | "item";
  order: string;
  color?: string;
}

export interface Group extends Base {
  type: "group";
}

export interface Item extends Base {
  type: "item";
  img: string;
  group: Id;
}

export type Entity = Group | Item;

const sortByOrder = (entities: Entity[]) => {
  const sorted = entities.map((item) => ({ order: new Big(item.order), item }));
  sorted.sort((a, b) => a.order.cmp(b.order));
  return sorted.map((entry) => entry.item);
};

function createModal(entities, id, editor, deletor) {
  const [open, setOpen] = createSignal(false);

  return {
    openModal() {
      setOpen(true);
    },
    Modal() {
      return (
        <Portal>
          <Show when={open()}>
            <div class="absolute inset-0 flex justify-center w-screen h-screen bg-opacity-50 bg-black items-center">
              <GroupForm
                entity={entities[id]}
                onSubmit={(values) => {
                  setOpen(false);
                  editor(id, values);
                }}
                onDelete={() => deletor(id)}
              />
            </div>
          </Show>
        </Portal>
      );
    },
  };
}

function newItemModal(adder) {
  const [open, setOpen] = createSignal(false);

  return {
    openModal() {
      setOpen(true);
    },
    Modal() {
      return (
        <Portal>
          <Show when={open()}>
            <div class="absolute inset-0 flex justify-center w-screen h-screen bg-opacity-50 bg-black items-center">
              <ItemForm
                entity={{ name: "", img: "" }}
                onSubmit={(values) => {
                  setOpen(false);
                  adder(values);
                }}
                onDelete={() => undefined}
              />
            </div>
          </Show>
        </Portal>
      );
    },
  };
}

const ItemOverlay: VoidComponent<{ item: Item }> = (props) => {
  return (
    <div
      class="sortable w-20 h-20 bg-gray-200 bg-cover bg-center"
      style={`background-image: url('${props.item.img}')`}
    ></div>
  );
};

const Group: VoidComponent<{
  id: Id;
  name: string;
  color: string;
  items: Item[];
  editor: Function;
  deletor: Function;
  entities: Record<Id, Entity>;
}> = (props) => {
  const sortable = createSortable(props.id, { type: "group" });
  const sortedItemIds = () => props.items.map((item) => item.id);
  const { Modal, openModal } = createModal(
    props.entities,
    props.id,
    props.editor,
    props.deletor,
  );

  return (
    <>
      <div
        ref={sortable.ref}
        style={maybeTransformStyle(sortable.transform)}
        classList={{ "opacity-50": sortable.isActiveDraggable }}
        class="flex border-black border-b-4 box-content"
      >
        <div
          class="group w-20 h-full min-h-20 flex flex-shrink-0 box-content relative cursor-grab"
          {...sortable.dragActivators}
          style={`background-color: ${props.color}`}
        >
          <p class="text-center text-wrap text-xl justify-center align-middle m-auto font-bold">
            {props.name}
          </p>
          <button
            class="hidden group-hover:block absolute top-1 right-1 w-5 h-5 bg-gray-900 rounded-md bg-opacity-50 leading-[0.75rem]"
            onclick={openModal}
          >
            e
          </button>
        </div>
        <div class="bg-gray-900 flex flex-wrap w-full">
          <SortableProvider ids={sortedItemIds()}>
            <For each={props.items}>
              {(item) => (
                <ListItem id={item.id} item={item} group={item.group} />
              )}
            </For>
          </SortableProvider>
        </div>
      </div>
      <Modal />
    </>
  );
};

const Holding: VoidComponent<{
  id: Id;
  name: string;
  color: string;
  items: Item[];
  adder: Function;
}> = (props) => {
  const sortable = createSortable(props.id, { type: "group" });
  const sortedItemIds = () => props.items.map((item) => item.id);
  const { Modal, openModal } = newItemModal(props.adder);

  return (
    <div
      ref={sortable.ref}
      style={maybeTransformStyle(sortable.transform)}
      class="flex border-black box-content mt-16 border-8"
    >
      <div class="bg-gray-900 flex flex-wrap w-full min-h-20">
        <SortableProvider ids={sortedItemIds()}>
          <For each={props.items}>
            {(item) => (
              <ListItem
                id={item.id}
                item={{ name: item.name, img: item.img }}
                group={item.group}
              />
            )}
          </For>
        </SortableProvider>
        <button class="w-14 h-14 m-3 bg-green-500" onClick={openModal}>
          +
        </button>
      </div>
      <Modal />
    </div>
  );
};

const GroupOverlay: VoidComponent<{
  name: string;
  color: string;
  items: Item[];
}> = (props) => {
  return (
    <div class="flex border-black border-4 box-content">
      <div
        class="group w-20 h-full min-h-20 flex flex-shrink-0 box-content relative cursor-grab"
        style={`background-color: ${props.color}`}
      >
        <p class="text-center text-wrap text-xl justify-center align-middle m-auto font-bold">
          {props.name}
        </p>
      </div>
      <div class="bg-gray-900 flex w-full">
        <For each={props.items}>{(item) => <ItemOverlay item={item} />}</For>
      </div>
    </div>
  );
};

type TierListItem = { name: string; img: string };

const ListItem: VoidComponent<{
  id: Id;
  item: TierListItem;
  group: Id;
}> = (props) => {
  const sortable = createSortable(props.id, {
    type: "item",
    group: props.group,
  });
  return (
    <div
      ref={sortable}
      classList={{ "opacity-25": sortable.isActiveDraggable }}
      class="sortable w-20 h-20 bg-cover bg-center cursor-grab"
      style={`background-image: url('${props.item.img}')`}
      use:tippy={{
        props: {
          content: props.item.name,
          duration: 0,
          offset: [0, -10],
        },
        hidden: true,
      }}
    ></div>
  );
};

export const TierList = () => {
  const [entities, setEntities] = createStore<Record<Id, Entity>>({});

  let nextOrder = 0;

  const getNextOrder = () => {
    nextOrder += ORDER_DELTA;
    return nextOrder.toString();
  };

  var index = 0;

  const addGroup = (name: string, color?: string) => {
    setEntities(index, {
      id: index,
      name,
      color: color,
      type: "group",
      order: getNextOrder(),
    });
    index += 1;
  };

  const addItem = (item: TierListItem) => {
    setEntities(index, {
      id: index,
      name: item.name,
      img: item.img,
      group: 0,
      type: "item",
      order: getNextOrder(),
    });
    index += 1;
  };

  const setup = () => {
    batch(() => {
      addGroup("holding");
      addGroup("S", "#f24722");
      addGroup("A", "#fea629");
      addGroup("B", "#ffcd2a");
      addGroup("C", "#13ae5c");
      addGroup("D", "#0b99ff");
      addGroup("E", "#9747ff");
      addGroup("F", "#fb47ff");
      addItem({ name: "Grass", img: "https://picsum.photos/200/300?random=1" });
      addItem({
        name: "not grass",
        img: "https://picsum.photos/200/300?random=2",
      });
      addItem({
        name: "some name",
        img: "https://picsum.photos/200/300?random=3",
      });
      addItem({
        name: "idol #1",
        img: "https://picsum.photos/200/300?random=4",
      });
      addItem({
        name: "idol #2",
        img: "https://picsum.photos/200/300?random=5",
      });
      addItem({
        name: "building",
        img: "https://picsum.photos/200/300?random=6",
      });
      addItem({ name: "idk", img: "https://picsum.photos/200/300?random=7" });
      addItem({
        name: "i cant think of any more",
        img: "https://picsum.photos/200/300?random=9",
      });
      addItem({
        name: "i cant think of any more",
        img: "https://picsum.photos/200/300?random=10",
      });
      addItem({
        name: "cool name here",
        img: "https://picsum.photos/200/300?random=11",
      });
      addItem({
        name: "cool name here",
        img: "https://picsum.photos/200/300?random=12",
      });
      addItem({
        name: "cool name here",
        img: "https://picsum.photos/200/300?random=13",
      });
    });
  };

  onMount(setup);

  const groups = () =>
    sortByOrder(
      Object.values(entities).filter((item) => item.type === "group"),
    ) as Group[];

  const groupIds = () => groups().map((group) => group.id);

  const groupOrders = () => groups().map((group) => group.order);

  const groupItems = (groupId: Id) =>
    sortByOrder(
      Object.values(entities).filter(
        (entity) => entity.type === "item" && entity.group === groupId,
      ),
    ) as Item[];

  const groupItemIds = (groupId: Id) =>
    groupItems(groupId).map((item) => item.id);

  const groupItemOrders = (groupId: Id) =>
    groupItems(groupId).map((item) => item.order);

  const isSortableGroup = (sortable: Draggable | Droppable) =>
    sortable.data.type === "group";

  const closestEntity: CollisionDetector = (draggable, droppables, context) => {
    const closestGroup = closestCenter(
      draggable,
      droppables.filter((droppable) => isSortableGroup(droppable)),
      context,
    );
    if (isSortableGroup(draggable)) {
      return closestGroup;
    } else if (closestGroup) {
      const closestItem = closestCenter(
        draggable,
        droppables.filter(
          (droppable) =>
            !isSortableGroup(droppable) &&
            droppable.data.group === closestGroup.id,
        ),
        context,
      );

      if (!closestItem) {
        return closestGroup;
      }

      const changingGroup = draggable.data.group !== closestGroup.id;
      if (changingGroup) {
        const belowLastItem =
          groupItemIds(closestGroup.id).at(-1) === closestItem.id &&
          draggable.transformed.center.x > closestItem.transformed.center.x;

        if (belowLastItem) return closestGroup;
      }

      return closestItem;
    }
  };

  const edit = (id: Id, data: { name: string; color: string }) => {
    setEntities(id, {
      name: data.name,
      color: data.color,
    });
  };

  const deleteEntity = (id: Id) => {
    setEntities(id, undefined);
  };

  const move = (
    draggable: Draggable,
    droppable: Droppable,
    onlyWhenChangingGroup = true,
  ) => {
    if (!draggable || !droppable) return;

    const draggableIsGroup = isSortableGroup(draggable);
    const droppableIsGroup = isSortableGroup(droppable);

    const draggableGroupId = draggableIsGroup
      ? draggable.id
      : draggable.data.group;

    const droppableGroupId = droppableIsGroup
      ? droppable.id
      : droppable.data.group;

    if (
      onlyWhenChangingGroup &&
      (draggableIsGroup || draggableGroupId === droppableGroupId)
    ) {
      return;
    }

    let ids: Id[], orders: string[], order: Big;

    if (draggableIsGroup) {
      ids = groupIds();
      orders = groupOrders();
    } else {
      ids = groupItemIds(droppableGroupId);
      orders = groupItemOrders(droppableGroupId);
    }

    if (droppableIsGroup && !draggableIsGroup) {
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
      setEntities(draggable.id, (entity) => ({
        ...entity,
        order: order.toString(),
        group: droppableGroupId,
      }));
    }
  };

  const onDragOver: DragEventHandler = ({ draggable, droppable }) =>
    move(draggable, droppable);

  const onDragEnd: DragEventHandler = ({ draggable, droppable }) =>
    move(draggable, droppable, false);



  return (
    <div class="flex flex-col flex-1 self-stretch max-w-[656px] m-auto">
      <h1 class="text-4xl text-white m-auto my-8">create a tierlist</h1>
      <DragDropProvider
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        collisionDetector={closestEntity}
      >
        <DragDropSensors />
        <SortableProvider ids={groupIds()}>
          <div
            id="tierlist"
            class="grid grid-flow-row border-8 border-b-4 border-black"
          >
            <For each={groups().filter((g) => g.id != 0)}>
              {(group) => (
                <Group
                  id={group.id}
                  name={group.name}
                  color={group.color}
                  items={groupItems(group.id)}
                  editor={edit}
                  entities={entities}
                  deletor={deleteEntity}
                />
              )}
            </For>
          </div>
          <Holding
            id={0}
            name={"holding"}
            color={undefined}
            items={groupItems(0)}
            adder={addItem}
          />
        </SortableProvider>

        <DragOverlay>
          {(draggable) => {
            const entity = entities[draggable.id];
            return isSortableGroup(draggable) ? (
              <GroupOverlay
                name={entity.name}
                color={entity.color}
                items={groupItems(entity.id)}
              />
            ) : (
              <ItemOverlay item={entity as Item} />
            );
          }}
        </DragOverlay>
      </DragDropProvider>

      <button
        class=" bg-gray-900 py-1 px-2 rounded-md text-xl text-white m-auto my-8 hover:bg-gray-700"
        onclick={screenshot}
      >
        Download image
      </button>
    </div>
  );
};
