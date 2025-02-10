import { createSignal, onMount, Show, VoidComponent } from "solid-js";
import { Tier, Item } from "./Tierlist";
import Cropper, { Area, Point } from "solid-easy-crop";
import { createDropzone } from '@soorria/solid-dropzone'
import { BsImage } from 'solid-icons/bs'
import { makeEventListener } from "@solid-primitives/event-listener";
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
    <div class="bg-black rounded-xl p-8 justify-center text-white">
      <div class="flex flex-col gap-4">
        <label>Tier label</label>
        <input
          value={name()}
          class="bg-gray-900 rounded-sm p-1"
          onChange={(e) => setName(e.target.value)}
        />
        <label>Background color</label>
        <input
          type="color"
          value={color()}
          class="w-full rounded-md border-white border-2 h-10"
          onChange={(e) => setColor(e.target.value)}
        />
        <button
          class="bg-green-800 p-1 rounded-sm font-bold"
          type="submit"
          onClick={handleSubmit}
        >
          OK
        </button>
        <button
          class="bg-red-800 p-1 rounded-sm font-bold"
          onClick={() => props.onDelete()}
        >
          {props.deleteText ?? "Delete"}
        </button>
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

  const onDrop = (acceptedFiles: File[]) => {
    handleUpload(acceptedFiles[0])
  }

  const dropzone = createDropzone({ onDrop })

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

  const clear = makeEventListener(
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
        }, "image/jpeg");
      });
    } catch (e) {
      console.log("Couldn't crop image due to", e);
    }
  };

  const handleSubmit = async () => {
    if (img() === null) {
      let croppedImage = await cropImage(preview(), cropArea());
      setImg(croppedImage);
      setPreview(null);
    }
    props.onSubmit({ name: name(), image_url: img() });
  };

  const handleFileInput = async (e) => {
    e.preventDefault();
    let file = e.currentTarget.files[0];
    if (!file) return;
    try {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(file);
      setImg(null);
    } catch (e) {
      console.error("upload failed", e);
    }
  };

  return (
    <div class="bg-black rounded-xl p-8 justify-center text-white">
      <div class="flex flex-col gap-4 max-w-80">
        <label class="leading-3" for="name-input">
          Item label
        </label>
        <input
          name="name"
          value={name()}
          class="bg-gray-900 rounded-sm p-1"
          onChange={(e) => setName(e.target.value)}
        />

        <Show when={preview() === null}>
          <div {...dropzone.getRootProps()}>
            <input {...dropzone.getInputProps()} />
            {
              <div
                class="border-dashed border-gray-500 w-full border-2 rounded-xl h-32 text-gray-500 flex hover:bg-blue-900 hover:text-gray-200 hover:border-gray-200 bg-gray-950 cursor-pointer"
                classList={{ "border-gray-200 text-gray-200 bg-blue-900": dropzone.isDragActive }}>
                <BsImage class="m-auto" size={30} />
              </div>
            }
          </div>
        </Show>
        <Show when={preview() !== null}>
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
          />
          <input
            type="range"
            value={zoom()}
            min="1"
            max="3"
            step="0.05"
            onInput={(e) => setZoom(parseFloat(e.target.value))}
          />
        </Show>
        <Show when={img() !== null}>
          <img src={img()} />
        </Show>

        <button
          class="bg-green-800 p-1 rounded-sm font-bold"
          type="submit"
          onClick={handleSubmit}
        >
          OK
        </button>
        <button
          class="bg-red-800 p-1 rounded-sm font-bold"
          onClick={() => props.onDelete()}
        >
          {props.deleteText ?? "Delete"}
        </button>
      </div>
    </div>
  );
};
