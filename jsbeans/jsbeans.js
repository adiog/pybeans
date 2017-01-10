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
    if (Typoid.prototype.isPrototypeOf(a_typoid))
    {
        return a_typoid.is_instance_of(an_object);
    }
    else if (Bean.prototype.isPrototypeOf(a_typoid))
    {
        return a_typoid.is_instance_of(an_object);
    }
    else
    {
        throw "RuntimeError()";
    }
};


var Atom =
function(variant)
{
    this.variant = variant;

    this.__call__ =
    function(single_arg)
    {
        if (Typoid.prototype.isPrototypeOf(this.variant))
        {
            return this.variant.__call__(single_arg);
        }
        else //if (Bean.prototype.isPrototypeOf(this.variant))
             if (Bean.prototype.isPrototypeOf(this.variant) || ('Bean' == this.variant.__proto__.name))
        {
            console.log(this.variant);
            let a = new (this.variant)(single_arg);
            Bean.prototype.isPrototypeOf(a);
            return a;
        }
        else
        {
            alert("RuntimeError()");
        }
    };

    this.is_instance_of =
    function(an_object)
    {
        return this.variant.is_instance_of(an_object);
    };

    this.to_simple_data =
    function(an_object)
    {
        return this.variant.to_simple_data(an_object);
    };

    this.is_optional =
    function()
    {
        return (Optional.prototype.isPrototypeOf(this.variant));//.__class__.indexOf('Optional') != -1);
    };

    this.is_default =
    function()
    {
        return (Default.prototype.isPrototypeOf(this.variant));//.__class__.indexOf('Optional') != -1);
        //return (this.variant.__class__.indexOf('Default') != -1);
    };
};

var Register =
{
    atoms: {},
    specs: {},

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
            atom = this.atoms[type_list[0]];
            //if (atom instanceof Bean)
            console.log('o');
            console.log(atom);
            if (Bean.prototype.isPrototypeOf(atom) || ('Bean' == atom.__proto__.name))
            {
                console.log('x');
                return atom; //this.atoms[type_list[0]];
            }
            else
            {
                return new this.atoms[type_list[0]]();
            }
        }
        else
        {
            return new this.atoms[type_list[0]](new Atom(this.fold_invoke(type_list.slice(1))));
        }
    },

    get:
    function(label)
    {
        split_label = this.split_to_list(label, []);
        atom_to_be_wrapped = this.fold_invoke(split_label);
        return new Atom(atom_to_be_wrapped);
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
    for (k in bean_json)
    {
        bean_dict[k] = Register.get(bean_json[k]);
    }
    Register.specs[bean_class.name] = bean_dict;
};


class Typoid
{
    constructor() {}

    __call__(simple_data)
    {
        alert('NotImplementedError()');
    }

    is_instance_of(an_object)
    {
        alert('NotImplementedError()');
    }

    to_simple_data(an_object)
    {
        alert('NotImplementedError()');
    }
}


class BaseType extends Typoid
{
    is_instance_offunction(an_object)
    {
        alert('NotImplementedError()');
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
}
register_atom("Int", Int);


class String extends BaseType
{
    is_instance_of(an_object)
    {
        return Object.prototype.toString.call(an_object) === "[object String]";
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
}
register_atom("List", List);

/*
class DateTime(Typoid):
    def __call__(self, datetime_simple_data):
        year = datetime_simple_data[0]
        month = datetime_simple_data[1]
        day = datetime_simple_data[2]
        hour = datetime_simple_data[3]
        minute = datetime_simple_data[4]
        second = datetime_simple_data[5]
        microsecond = datetime_simple_data[6]
        return datetime.datetime(year=year, month=month, day=day, hour=hour, minute=minute, second=second, microsecond=microsecond)

    def is_instance_of(self, an_object):
        return isinstanceof(an_object, datetime.datetime)

    def to_simple_data(self, an_object):
        return [an_object.year, an_object.month, an_object.day, an_object.hour, an_object.minute, an_object.second, an_object.microsecond]
*/



class Bean
{
    get_spec()
    {
        console.log(this.constructor.name);
        return Register.specs[this.constructor.name];
    }

    in_spec(simple_data)
    {
        return true;
        // FIXME TODO SEND NUDES
        // return set(simple_data.keys()).issubset(cls.get_spec().keys());
    }

    is_instance_of(cls, an_object)
    {
        let spec = this.get_spec();

        if (!this.in_spec(an_object))
        {
            return false;
        }

        for(k in spec){
            if (!spec[k].is_instance_of(this.k))
            {
                return false;
            }
        }

        return true;
    }

    to_simple_data(an_object)
    {
        let spec = this.get_spec();
        let simple_data = {};
        for(k in spec)
        {
            simple_data[k] = spec[k].to_simple_data(this.k);
        }
        return simple_data;
    }

    cast_spec_dict(simple_data)
    {
        var spec = this.get_spec();
        for(k in spec)
        {
            this.cast_spec_dict_assign_field(k, spec[k], simple_data);
            console.log(k);
        }
    }

    cast_spec_dict_assign_field(field, field_spec, simple_data)
    {
        this[k] = this.cast_spec_field(field, field_spec, simple_data);
    }

    cast_spec_field(field, field_spec, simple_data)
    {
        console.log(simple_data);
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
                return this.get_default(field);
            }
            else
            {
                throw "TypeError()";
            }
        }
    }

    get_default(field)
    {
        throw "NotImplementedError()";
    }

    constructor(simple_data)
    {
        console.log(simple_data);
        if (this.in_spec(simple_data))
        {
            this.cast_spec_dict(simple_data);
        }
        else
        {
            throw "TypeError()";
        }
        console.log(this);
    }

    get_id()
    {
        return this[this.__name__ + '_id'];
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
