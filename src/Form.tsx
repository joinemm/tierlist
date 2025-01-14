import { createForm, SubmitHandler } from '@modular-forms/solid';
import { VoidComponent } from 'solid-js';
import { Entity } from './Tierlist';

type Groupform = {
  name: string;
  color: string;
};

export const FormComponent: VoidComponent<{ entity: Entity, onSubmit: Function; onDelete: Function }> = (props) => {
  const [formstore, { Form, Field }] = createForm<Groupform>();

  const handleSubmit: SubmitHandler<Groupform> = (values, event) => {
    console.log(values);
    props.onSubmit(values);
  };

  return (
    <div class="bg-black rounded-xl p-8 justify-center text-white">
      <Form class="flex flex-col gap-4" onSubmit={handleSubmit}>
        <label>name</label>
        <Field name="name">
          {(field, innerprops) => <input value={props.entity.name} class="bg-gray-900 rounded-s p-1" {...innerprops} />}
        </Field>
        <label>color</label>
        <Field name="color">
          {(field, innerprops) => <input value={props.entity.color} class="bg-gray-900 rounded-s p-1"{...innerprops} />}
        </Field>
        <button class="bg-green-800 p-1 rounded-m font-bold" type="submit" >OK</button>
        <button class="bg-red-800 p-1 rounded-m font-bold" onClick={() => props.onDelete()} >Delete</button>
      </Form>
    </div>
  )
}
