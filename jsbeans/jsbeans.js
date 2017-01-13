// This file is a part of pybeans project.
// Copyright (c) 2017 Aleksander Gajewski <adiog@brainfuck.pl>.


if (!Array.prototype.last){
    Array.prototype.last = function(){
        return this[this.length - 1];
    };
};


var isinstanceof =
function(an_object, a_typoid)
{
    if (Atom.prototype.isPrototypeOf(a_typoid))
    {
        return a_typoid.is_instance_of(an_object);
    }
    else if (Typoid.prototype.isPrototypeOf(a_typoid))
    {
        return a_typoid.is_instance_of(an_object);
    }
    else if (Bean.prototype.isPrototypeOf(a_typoid))
    {
        return a_typoid.is_instance_of(an_object);
    }
    else
    {
        return an_object instanceof a_typoid;
    }
};


class Atom
{
    constructor(variant)
    {
        this.variant = variant;
    }

    __call__(pargs)
    {
        if (Typoid.prototype.isPrototypeOf(this.variant))
        {
            return this.variant.__call__(pargs);
        }
        else
        {
            return new (this.variant)(pargs);
        }
    }

    is_instance_of(an_object)
    {
        return this.variant.is_instance_of(an_object);
    }

    to_simple_data(an_object)
    {
        return this.variant.to_simple_data(an_object);
    }

    is_optional()
    {
        return (Optional.prototype.isPrototypeOf(this.variant));
    }

    is_default()
    {
        return (Default.prototype.isPrototypeOf(this.variant));
    }

    get_default()
    {
        return this.variant.get_default();
    }
};

class Atomic
{
    static as_atom(pargs)
    {
        throw "NotImplementedError()";
    }
}

var Register =
{
    atoms: {},
    specs: {},
    defaults: {},

    split_to_list:
    function(label, type_list)
    {
        if (label in Register.atoms)
        {
            type_list.push(label)
            return type_list
        }
        else
        {
            try
            {
                var regex = /(\w+).*/;
                var match = regex.exec(label);
                a_type = match[1];
            } catch(e)
            {
                alert("RegisterError('Unknown atom in " + label + " of expected form 'atom(...)'")
            }
            try
            {
                var regex = /\((.*)\)/;
                var match = regex.exec(label);
                remaining_label = match[1];
            } catch(e)
            {
                alert("RegisterError('Unknown form in " + label + " of expected form '...(form)'")
            }
            type_list.push(a_type);
            return this.split_to_list(remaining_label, type_list);
        }
    },

    fold_invoke:
    function(type_list)
    {
        if (type_list.length == 1)
        {
            atomic = this.atoms[type_list[0]];
            return atomic.as_atom();
        }
        else
        {
            return this.atoms[type_list[0]].as_atom(this.fold_invoke(type_list.slice(1)));
        }
    },

    get:
    function(label)
    {
        split_label = this.split_to_list(label, []);
        return this.fold_invoke(split_label);
    }
};


var register_atom =
function(atom_name, atom_class)
{
    Register.atoms[atom_name] = atom_class;
};


var register_bean_spec =
function(bean_name, bean_class, bean_spec)
{
    register_atom(bean_name, bean_class);
    bean_json = JSON.parse(bean_spec);
    bean_dict = {}
    bean_defaults = {};
    for (k in bean_json)
    {
        if (k === '__defaults__')
        {
            bean_defaults = bean_json[k];
        }
        else
        {
            bean_dict[k] = Register.get(bean_json[k]);
        }
    }
    Register.specs[bean_class.name] = bean_dict;
    Register.defaults[bean_class.name] = bean_defaults;
};


class Typoid extends Atomic
{
    static as_atom(pargs)
    {
        return new Atom(new this(pargs));
    }

    constructor() {super();}

    __call__(simple_data)
    {
        throw 'NotImplementedError()';
    }

    is_instance_of(an_object)
    {
        throw 'NotImplementedError()';
    }

    to_simple_data(an_object)
    {
        throw 'NotImplementedError()';
    }

    get_default()
    {
        throw 'NotImplementedError()';
    }
}


class BaseType extends Typoid
{
    is_instance_offunction(an_object)
    {
        throw 'NotImplementedError()';
    }

    __call__(an_object)
    {
        if (this.is_instance_of(an_object))
        {
            return an_object;
        }
        else
        {
            throw 'TypeError()';
        }
    }

    to_simple_data(an_object)
    {
        if (this.is_instance_of(an_object))
        {
            return an_object;
        }
        else
        {
            throw 'TypeError()';
        }
    }
}

class Int extends BaseType
{
    is_instance_of(an_object)
    {
        return Object.prototype.toString.call(an_object) === "[object Number]";
    }

    get_default()
    {
        return 0;
    }
}
register_atom("Int", Int);


class String extends BaseType
{
    is_instance_of(an_object)
    {
        return Object.prototype.toString.call(an_object) === "[object String]";
    }

    get_default()
    {
        return '';
    }
}
register_atom("String", String);


class Optional extends Typoid
{
    constructor(element_type)
    {
        super();
        this.element_type = element_type;
    }

    __call__(an_optional)
    {
        if (an_optional == null)
        {
            return null;
        }
        else
        {
            return this.element_type.__call__(an_optional);
        }
    }

    is_instance_of(an_object)
    {
        return ((an_object == null) || (isinstanceof(an_object, this.element_type)));
    }

    to_simple_data(an_object)
    {
        if (an_object == null)
        {
            return null;
        }
        else
        {
            return this.element_type.to_simple_data(an_object);
        }
    }

    get_default()
    {
        return null;
    }
}
register_atom("Optional", Optional);


class Forward extends Typoid
{
    constructor(element_type)
    {
        super();
        this.element_type = element_type;
    }

    __call__(an_optional)
    {
        return this.element_type.__call__(an_optional);
    }

    is_instance_of(an_object)
    {
        return isinstanceof(an_object, this.element_type);
    }

    to_simple_data(an_object)
    {
        return this.element_type.to_simple_data(an_object);
    }

    get_default()
    {
        return this.element_type.get_default();
    }
}
register_atom("Optional", Optional);


class Default extends Forward
{
}
register_atom("Default", Default);


class List extends Typoid
{
    constructor(element_type)
    {
        super();
        this.element_type = element_type;
    }

    __call__(a_list)
    {
        let that = this;
        return a_list.map(function(an_element){return that.element_type.__call__(an_element);});
    }

    is_instance_of(a_list)
    {
        let than = this;
        return a_list.every(function(an_element){return isinstanceof(an_element, that.element_type);});
    }

    to_simple_data(a_list)
    {
        let that = this;
        return a_list.map(function(an_element){return that.element_type.to_simple_data(an_element);});
    }

    get_default()
    {
        return new Array();
    }
}
register_atom("List", List);


class Bean extends Atomic
{
    static as_atom()
    {
        return new Atom(this);
    }

    get_spec()
    {
        return Register.specs[this.constructor.name];
    }

    static get_defaults()
    {
        return Register.defaults[this.name];
    }

    in_spec(simple_data)
    {
        let spec = this.get_spec();
        return Object.keys(simple_data).every(function(field){return field in spec;});
    }

    static is_instance_of(an_object)
    {
        let spec = this.constructor.get_spec();

        if (!this.constructor.in_spec(an_object))
        {
            return false;
        }

        for(k in spec){
            if (!spec[k].is_instance_of(an_object[k]))
            {
                return false;
            }
        }

        return true;
    }

    to_simple_data(an_object)
    {
        let spec = this.constructor.get_spec();
        let simple_data = {};
        for(k in spec)
        {
            simple_data[k] = spec[k].to_simple_data(an_object[k]);
        }
        return simple_data;
    }

    cast_spec_dict(simple_data)
    {
        var spec = this.get_spec();
        for(k in spec)
        {
            this.cast_spec_dict_assign_field(k, spec[k], simple_data);
        }
    }

    cast_spec_dict_assign_field(field, field_spec, simple_data)
    {
        this[k] = this.cast_spec_field(field, field_spec, simple_data);
    }

    cast_spec_field(field, field_spec, simple_data)
    {
        if (field in simple_data)
        {
            return field_spec.__call__(simple_data[field]);
        }
        else
        {
            if (field_spec.is_optional())
            {
                return null;
            }
            else if (field_spec.is_default())
            {
                return this.constructor.get_field_default(field, field_spec);
            }
            else
            {
                throw "TypeError()";
            }
        }
    }

    static get_field_default(field, field_spec)
    {
        try
        {
            return this.get_runtime_default(field, field_spec);
        }
        catch (e)
        {
            return this.get_static_default(field, field_spec);
        }
    }

    static get_runtime_default(field, field_spec)
    {
        throw "NotImplementedError()";
    }

    static get_static_default(field, field_spec)
    {
        if (field in this.get_defaults())
        {
            return field_spec.__call__(this.get_defaults()[field]);
        }
        else
        {
            return field_spec.get_default();
        }
    }

    constructor(simple_data)
    {
        super();

        if (this.in_spec(simple_data))
        {
            this.cast_spec_dict(simple_data);
        }
        else
        {
            throw "TypeError()";
        }
    }

    get_id()
    {
        return this[this.constructor.name + '_id'];
    }
}

class MinimalBean extends Bean
{
    cast_spec_dict_assign_field(field, field_spec, simple_data)
    {
        if ((!field_spec.is_default()) || (field in simple_data))
        {
            this[k] = this.cast_spec_field(k, spec[k], simple_data);
        }
    }
}
