import { createSignal, Show, VoidComponent } from "solid-js";
import { Tier, Item } from "./Tierlist";
import Cropper from "solid-easy-crop";
import "./easy-crop-style.css";

export const TierForm: VoidComponent<{
  tier: Tier | null;
  onSubmit: Function;
  onDelete: Function;
  deleteText?: string;
}> = (props) => {
  const [name, setName] = createSignal(
    props.tier != null ? props.tier.name : "",
  );
  const [color, setColor] = createSignal(
    props.tier != null ? props.tier.color : "",
  );

  const handleSubmit = () => {
    props.onSubmit({ name: name(), color: color() });
  };

  return (
    <div class="bg-black rounded-xl p-8 justify-center text-white">
      <div class="flex flex-col gap-4">
        <label>Name</label>
        <input
          value={props.tier ? props.tier.name : ""}
          class="bg-gray-900 rounded-s p-1"
          onChange={(e) => setName(e.target.value)}
        />
        <label>Color</label>
        <input
          type="color"
          value={props.tier ? props.tier.color : ""}
          class="bg-gray-900 rounded-s p-1"
          onChange={(e) => setColor(e.target.value)}
        />
        <button
          class="bg-green-800 p-1 rounded-m font-bold"
          type="submit"
          onClick={handleSubmit}
        >
          OK
        </button>
        <button
          class="bg-red-800 p-1 rounded-m font-bold"
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
    props.item != null ? props.item.image_url : "",
  );
  const [crop, setCrop] = createSignal({ x: 0, y: 0 });
  const [cropArea, setCropArea] = createSignal(null);
  const [zoom, setZoom] = createSignal(1);
  const [preview, setPreview] = createSignal(null);

  const cropImage = async (imgUri, pixelCrop): Promise<string> => {
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

  const handleSubmit = () => {
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

  const showCroppedImage = async () => {
    console.log("preview=", preview());
    let croppedImage = await cropImage(preview(), cropArea());
    setImg(croppedImage);
    console.log(croppedImage);
    setPreview(null);
  };

  return (
    <div class="bg-black rounded-xl p-8 justify-center text-white">
      <div class="flex flex-col gap-4 max-w-80">
        <label>Name</label>
        <input
          name="name"
          value={name()}
          class="bg-gray-900 rounded-s p-1"
          onChange={(e) => setName(e.target.value)}
        />
        <label>Image</label>
        <input
          id="image-upload"
          name="file"
          type="file"
          multiple={false}
          onInput={handleFileInput}
        />
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
          <button
            class="bg-blue-800 p-1 rounded-m font-bold"
            onClick={showCroppedImage}
          >
            CROP
          </button>
        </Show>
        <Show when={img() !== null}>
          <img src={img()} />
        </Show>

        <Show when={preview() === null}>
          <button
            class="bg-green-800 p-1 rounded-m font-bold"
            type="submit"
            onClick={handleSubmit}
          >
            OK
          </button>
        </Show>
        <button
          class="bg-red-800 p-1 rounded-m font-bold"
          onClick={() => props.onDelete()}
        >
          {props.deleteText ?? "Delete"}
        </button>
      </div>
    </div>
  );
};
