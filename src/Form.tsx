import { createSignal, Show, VoidComponent } from "solid-js";
import { Tier, Item } from "./Tierlist";
import Cropper, { Area, Point } from "solid-easy-crop";
import { createDropzone } from '@soorria/solid-dropzone'
import { BsImage } from 'solid-icons/bs'
import { makeEventListener } from "@solid-primitives/event-listener";
import { FaSolidXmark } from 'solid-icons/fa'
import { RiSystemDeleteBin6Line } from 'solid-icons/ri'
import "./easy-crop-style.css";

export const TierForm: VoidComponent<{
  tier: Tier | null;
  onSubmit: Function;
  onDelete: Function;
  deleteText?: string;
}> = (props) => {
  const [name, setName] = createSignal(
    props.tier != null ? props.tier.name : "New Tier",
  );
  const [color, setColor] = createSignal(
    props.tier != null ? props.tier.color : "#ffffff",
  );

  const handleSubmit = () => {
    props.onSubmit({ name: name(), color: color() });
  };

  return (
    <div class="bg-black rounded-xl p-8 justify-center text-white font-mono">
      <div class="flex flex-col gap-4 w-60">
        <div class="flex flex-col gap-1">
          <label>Tier label</label>
          <input
            value={name()}
            class="bg-gray-900 rounded-md p-2"
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div class="flex flex-col gap-1">
          <label>Background color</label>
          <input
            type="color"
            value={color()}
            class="w-full rounded-[0.6rem] h-10"
            onChange={(e) => setColor(e.target.value)}
          />
        </div>
        <div class="flex gap-4">
          <button
            class="p-2 w-full rounded-xl font-bold bg-black border-2 hover:text-black hover:bg-green-600 border-green-600 text-green-600"
            type="submit"
            onClick={handleSubmit}
          >
            Save
          </button>
          <button
            class="p-2 w-full rounded-xl font-bold bg-black border-2 hover:text-black hover:bg-red-600 border-red-600 text-red-600"
            onClick={() => props.onDelete()}
          >
            {props.deleteText ?? "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};

export const ItemForm: VoidComponent<{
  item: Item | null;
  onSubmit: Function;
  onDelete: Function;
  deleteText?: string;
}> = (props) => {
  const [name, setName] = createSignal(
    props.item != null ? props.item.name : "",
  );
  const [img, setImg] = createSignal(
    props.item != null ? props.item.image_url : null,
  );
  const [crop, setCrop] = createSignal<Point>({ x: 0, y: 0 });
  const [cropArea, setCropArea] = createSignal<Area>(null);
  const [zoom, setZoom] = createSignal<number>(1);
  const [preview, setPreview] = createSignal(null);

  const handlePaste = (event: ClipboardEvent) => {
    const items = event.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        handleUpload(file)
      }
    }
  };

  const onDrop = (acceptedFiles: File[]) => {
    handleUpload(acceptedFiles[0])
  }

  const dropzone = createDropzone({ onDrop })

  makeEventListener(
    document,
    "paste",
    handlePaste,
    { passive: true }
  );

  const handleUpload = (file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(file);
      setImg(null);
    } catch (e) {
      console.error("upload failed", e);
    }
  }

  const cropImage = async (
    imgUri: string,
    pixelCrop: Area,
  ): Promise<string> => {
    try {
      let resize_canvas = document.createElement("canvas");
      let orig_src = new Image();
      orig_src.src = imgUri;
      resize_canvas.width = pixelCrop.width;
      resize_canvas.height = pixelCrop.height;
      let cnv = resize_canvas.getContext("2d");
      cnv.drawImage(
        orig_src,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height,
      );
      return new Promise((resolve, _) => {
        resize_canvas.toBlob((file) => {
          resolve(URL.createObjectURL(file));
        });
      });
    } catch (e) {
      console.log("Couldn't crop image due to", e);
    }
  };

  const handleCrop = async () => {
    let croppedImage = await cropImage(preview(), cropArea());
    setImg(croppedImage);
    setPreview(null);
  }

  const handleSubmit = async () => {
    props.onSubmit({ name: name(), image_url: img() });
  };

  return (
    <div class="bg-black rounded-xl p-8 justify-center text-white font-mono">
      <div class="flex flex-col gap-4 w-80">
        <Show when={preview() === null}>
          <div class="flex flex-col gap-1">
            <label>
              Item label
            </label>
            <input
              name="name"
              value={name()}
              class="bg-gray-900 rounded-md p-2"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <Show when={img() === null}>
            <div {...dropzone.getRootProps()}>
              <input {...dropzone.getInputProps()} type="file" accept="image" multiple={false} />
              {
                <div
                  class="border-dashed border-gray-500 w-full border-2 rounded-xl h-80 text-gray-500 flex flex-col justify-center text-center items-center hover:bg-blue-900 hover:text-gray-200 hover:border-gray-200 bg-gray-950 cursor-pointer"
                  classList={{ "border-gray-200 text-gray-200 bg-blue-900": dropzone.isDragActive }}>
                  <BsImage class="mx-auto" size={30} />
                  <p>Select, drop <br></br>or paste image</p>
                </div>
              }
            </div>
          </Show>
          <Show when={img() !== null}>
            <div class="relative">
              <img class="rounded-md w-full" src={img()} />
              <button
                class="rounded-full border-white border-2 hover:border-red-700 hover:bg-red-700 absolute top-2 right-2 w-10 h-10 text-center text-white drop-shadow"
                onClick={() => setImg(null)}
              >
                <RiSystemDeleteBin6Line class="m-auto drop-shadow" size={24} />
              </button>
            </div>
          </Show>
          <div class="flex gap-4">
            <button
              class="p-2 w-full rounded-xl font-bold bg-black border-2 hover:text-black hover:bg-green-600 border-green-600 text-green-600"
              type="submit"
              onClick={handleSubmit}
            >
              Save
            </button>
            <button
              class="p-2 w-full rounded-xl font-bold bg-black border-2 hover:text-black hover:bg-red-600 border-red-600 text-red-600"
              onClick={() => props.onDelete()}
            >
              {props.deleteText ?? "Delete"}
            </button>
          </div>
        </Show>

        <Show when={preview()}>
          <Cropper
            image={preview()}
            crop={crop()}
            zoom={zoom()}
            aspect={1 / 1}
            onZoomChange={setZoom}
            onCropChange={setCrop}
            onCropComplete={(_, croppedAreaPixels) =>
              setCropArea(croppedAreaPixels)
            }
            objectFit={"auto-cover"}
            style={{ containerStyle: { "background-color": "white" } }}
            restrictPosition={true}
          />
          <input
            class="cursor-pointer"
            type="range"
            value={zoom()}
            min="1"
            max="3"
            step="0.05"
            onInput={(e) => setZoom(parseFloat(e.target.value))}
          />
          <div class="flex gap-4">
            <button
              class="p-2 w-full rounded-xl font-bold bg-black border-2 hover:text-black hover:bg-blue-600 border-blue-600 text-blue-600"
              type="submit"
              onClick={handleCrop}
            >
              Crop
            </button>
            <button
              class="p-2 w-full rounded-xl font-bold bg-black border-2 hover:text-black hover:bg-red-600 border-red-600 text-red-600"
              onClick={() => setPreview(null)}
            >
              Cancel
            </button>
          </div>
        </Show>
      </div>
    </div >
  );
};
