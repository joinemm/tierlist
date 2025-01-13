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
import { batch, For, onMount, VoidComponent } from "solid-js";
import { createStore } from "solid-js/store";
import Big from "big.js";
import { TippyOptions } from 'solid-tippy';
import { tippy } from 'solid-tippy';
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

interface Group extends Base {
  type: "group";
}

interface Item extends Base {
  type: "item";
  img: string,
  group: Id;
}

type Entity = Group | Item;

const sortByOrder = (entities: Entity[]) => {
  const sorted = entities.map((item) => ({ order: new Big(item.order), item }));
  sorted.sort((a, b) => a.order.cmp(b.order));
  return sorted.map((entry) => entry.item);
};

const ItemOverlay: VoidComponent<{ item: Item }> = (props) => {
  return <div
    class="sortable w-20 h-20 bg-gray-200 bg-cover bg-center"
    style={`background-image: url('${props.item.img}')`}>
  </div>;
};

const Group: VoidComponent<{ id: Id; name: string; color: string; items: Item[] }> = (
  props
) => {
  const sortable = createSortable(props.id, { type: "group" });
  const sortedItemIds = () => props.items.map((item) => item.id);

  return (
    <div
      ref={sortable.ref}
      style={maybeTransformStyle(sortable.transform)}
      classList={{ "opacity-50": sortable.isActiveDraggable }}
      class="flex flex-1 border-black border-b-4"
    >
      <div class="w-24 h-20 flex border-r-4 border-black" {...sortable.dragActivators} style={`background-color: ${props.color}`}>
        <p class="text-center text-4xl justify-center align-middle m-auto text-white font-bold">
          {props.name}
        </p>
      </div>
      <div class="bg-[#1a1a17] flex w-full">
        <SortableProvider ids={sortedItemIds()}>
          <For each={props.items}>
            {(item) => (
              <ListItem id={item.id} item={{ name: item.name, img: item.img }} group={item.group} />
            )}
          </For>
        </SortableProvider>
      </div>
    </div>
  );
};

const GroupOverlay: VoidComponent<{ name: string; color: string; items: Item[] }> = (
  props
) => {
  return (
    <div class="flex flex-1 border-black border-4">
      <div class="w-24 h-20 flex border-r-4 border-black" style={`background-color: ${props.color}`}>
        <p class="text-center text-4xl justify-center align-middle m-auto text-white font-bold">
          {props.name}
        </p>
      </div>
      <div class="bg-[#1a1a17] flex w-full">
        <For each={props.items}>
          {(item) => <ItemOverlay item={item} />}
        </For>
      </div>
    </div>
  );
};

type TierListItem = { name: string, img: string };

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
      class="sortable w-20 h-20 bg-[#363636] bg-cover bg-center"
      style={`background-image: url('${props.item.img}')`}
      use:tippy={{
        props: {
          content: props.item.name,
          duration: 0,
          offset: [0, -10]
        },
        hidden: true
      }}>
    </div >
  );
}

export const BoardExample = () => {
  const [entities, setEntities] = createStore<Record<Id, Entity>>({});

  let nextOrder = 0;

  const getNextOrder = () => {
    nextOrder += ORDER_DELTA;
    return nextOrder.toString();
  };

  const addGroup = (id: Id, name: string, color?: string) => {
    setEntities(id, {
      id,
      name,
      color: color,
      type: "group",
      order: getNextOrder(),
    });
  };

  const addItem = (id: Id, item: TierListItem, group: Id) => {
    setEntities(id, {
      id,
      name: item.name,
      img: item.img,
      group,
      type: "item",
      order: getNextOrder(),
    });
  };

  const setup = () => {
    batch(() => {
      addGroup(1, "S", "#f24722");
      addGroup(2, "A", "#fea629");
      addGroup(3, "B", "#ffcd2a");
      addGroup(4, "C", "#13ae5c");
      addGroup(5, "D", "#0b99ff");
      addGroup(6, "E", "#9747ff");
      addGroup(7, "F", "#fb47ff");
      addItem(8, { name: "Grass", img: "https://picsum.photos/200/300?random=1" }, 1);
      addItem(9, { name: "not grass", img: "https://picsum.photos/200/300?random=2" }, 1);
      addItem(10, { name: "some name", img: "https://picsum.photos/200/300?random=3" }, 2);
      addItem(11, { name: "idol #1", img: "https://picsum.photos/200/300?random=4" }, 5);
      addItem(12, { name: "yeji", img: "https://picsum.photos/200/300?random=5" }, 1);
      addItem(13, { name: "building", img: "https://picsum.photos/200/300?random=6" }, 4);
      addItem(14, { name: "idk", img: "https://picsum.photos/200/300?random=7" }, 2);
      addItem(15, { name: "i cant think of any more", img: "https://picsum.photos/200/300?random=8" }, 6);
    });
  };

  onMount(setup);

  const groups = () =>
    sortByOrder(
      Object.values(entities).filter((item) => item.type === "group")
    ) as Group[];

  const groupIds = () => groups().map((group) => group.id);

  const groupOrders = () => groups().map((group) => group.order);

  const groupItems = (groupId: Id) =>
    sortByOrder(
      Object.values(entities).filter(
        (entity) => entity.type === "item" && entity.group === groupId
      )
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
      context
    );
    if (isSortableGroup(draggable)) {
      return closestGroup;
    } else if (closestGroup) {
      const closestItem = closestCenter(
        draggable,
        droppables.filter(
          (droppable) =>
            !isSortableGroup(droppable) &&
            droppable.data.group === closestGroup.id
        ),
        context
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

  const move = (
    draggable: Draggable,
    droppable: Droppable,
    onlyWhenChangingGroup = true
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
            orders[droppableIndex - 1] ?? orderBefore.minus(ORDER_DELTA * 2)
          );
        } else {
          orderAfter = new Big(orders[droppableIndex]);
          orderBefore = new Big(
            orders[droppableIndex + 1] ?? orderAfter.plus(ORDER_DELTA * 2)
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
    <>
      <div class="flex flex-col flex-1 mt-5 self-stretch">
        <DragDropProvider
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          collisionDetector={closestEntity}
        >
          <DragDropSensors />
          <div class="grid grid-flow-row border-8 border-b-4 border-black w-1/2">
            <SortableProvider ids={groupIds()}>
              <For each={groups()}>
                {(group) => (
                  <Group
                    id={group.id}
                    name={group.name}
                    color={group.color}
                    items={groupItems(group.id)}
                  />
                )}
              </For>
            </SortableProvider>
          </div>
          <DragOverlay>
            {(draggable) => {
              const entity = entities[draggable.id];
              return isSortableGroup(draggable) ? (
                <GroupOverlay name={entity.name} color={entity.color} items={groupItems(entity.id)} />
              ) : (
                <ItemOverlay item={entity as Item} />
              );
            }}
          </DragOverlay>
        </DragDropProvider>
      </div>
    </>
  );
};
