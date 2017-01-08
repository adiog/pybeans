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
    if (a_typoid.__class__)
    {
        if (a_typoid.__class__.indexOf("Typoid") != -1)
        {
            return a_typoid.is_instance_of(an_object);
        }
        else if (a_typoid.__class__.indexOf("Bean") != -1)
        {
            return a_typoid.is_instance_of(an_object);
        }
    }
    else
    {

    }
};

var issubclass =
function(an_object, a_class)
{
    ret = (an_object.__class__) &&
           (a_class.__class__) &&
           (an_object.__class__.indexOf(a_class.__class__.last()) != -1);
    return ret;
};

var Atom =
function(variant)
{
    this.variant = variant;

    this.__call__ =
    function(single_arg)
    {
        if (issubclass(this.variant, class_Typoid))
        {
            return this.variant.__call__(single_arg);
        }
        else if (issubclass(this.variant.prototype, class_Bean))
        {
            return new this.variant(single_arg);
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
        return (this.variant.__class__.indexOf('Optional') != -1);
    };

    this.is_default =
    function()
    {
        return (this.variant.__class__.indexOf('Default') != -1);
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
            atom_class = this.atoms[type_list[0]].prototype.__class__;
            if (atom_class.indexOf("Bean") != -1)
            {
                return this.atoms[type_list[0]];
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
function(atom_name, atom_prototype)
{
    atom_constructor = function(arg){atom_prototype.__init__(this, arg)};
    atom_constructor.prototype = atom_prototype;
    Register.atoms[atom_name] = atom_constructor;
};


var register_bean_spec =
function(bean_name, bean_prototype, bean_spec)
{
    bean_prototype.__name__ = bean_name;
    bean_prototype.__class__.last = bean_name;
    register_atom(bean_name, bean_prototype);
    bean_json = JSON.parse(bean_spec);
    bean_dict = {}
    for (k in bean_json)
    {
        bean_dict[k] = Register.get(bean_json[k]);
    }
    Register.specs[bean_name] = bean_dict;
};


var public =
function(base_prototype, derived_prototype)
{
    var public_prototype = Object.assign(Object.assign({}, base_prototype), derived_prototype);
    public_prototype.__class__ = base_prototype.__class__.concat(derived_prototype.__class__);
    return public_prototype;
};

var class_Typoid =
{
    __class__: ["Typoid"],

    __init__:
    function(that)
    {
    },

    __call__:
    function(simple_data)
    {
        alert('NotImplementedError()');
    },

    is_instance_of:
    function(self, an_object)
    {
        alert('NotImplementedError()');
    },

    to_simple_data:
    function(self, an_object)
    {
        alert('NotImplementedError()');
    }
};


var class_BaseType = public(class_Typoid,
{
    __class__: ["BaseType"],

    is_instance_of:
    function(an_object)
    {
        alert('NotImplementedError()');
    },

    __call__:
    function(an_object)
    {
        if (this.is_instance_of(an_object))
        {
            return an_object;
        }
        else
        {
            throw 'TypeError()';
        }
    },

    to_simple_data:
    function(an_object)
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
});


var class_Int = public(class_BaseType,
{
    __class__: ["Int"],

    is_instance_of:
    function(an_object)
    {
        return Object.prototype.toString.call(an_object) === "[object Number]";
    }
});
register_atom("Int", class_Int);


var class_String = public(class_BaseType,
{
    __class__: ["String"],

    is_instance_of:
    function(an_object)
    {
        return Object.prototype.toString.call(an_object) === "[object String]";
    }
});
register_atom("String", class_String);


var class_Optional = public(class_Typoid,
{
    __class__: ["Optional"],

    __init__:
    function(that, element_type)
    {
        that.element_type = element_type;
    },

    __call__:
    function(an_optional)
    {
        if (an_optional == null)
        {
            return null;
        }
        else
        {
            return this.element_type.__call__(an_optional);
        }
    },

    is_instance_of:
    function(an_object)
    {
        return ((an_object == null) || (isinstanceof(an_object, this.element_type)));
    },

    to_simple_data:
    function(an_object)
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
});
register_atom("Optional", class_Optional);


var class_Forward = public(class_Typoid,
{
    __class__: ["Forward"],

    __init__:
    function(that, element_type)
    {
        that.element_type = element_type;
    },

    __call__:
    function(an_optional)
    {
        return this.element_type.__call__(an_optional);
    },

    is_instance_of:
    function(an_object)
    {
        return isinstanceof(an_object, this.element_type);
    },

    to_simple_data:
    function(an_object)
    {
        return this.element_type.to_simple_data(an_object);
    }
});
register_atom("Optional", class_Optional);


var class_Default = public(class_Forward, {
    __class__: ["Default"]
});
register_atom("Default", class_Default);


var class_List = public(class_Typoid,
{
    __class__: ["List"],

    __init__:
    function(that, element_type)
    {
        that.element_type = element_type;
    },

    __call__:
    function(a_list)
    {
        that = this;
        return a_list.map(function(an_element){return that.element_type.__call__(an_element);});
    },

    is_instance_of:
    function(a_list)
    {
        than = this;
        return a_list.every(function(an_element){return isinstanceof(an_element, that.element_type);});
    },

    to_simple_data:
    function(a_list)
    {
        that = this;
        return a_list.map(function(an_element){return that.element_type.to_simple_data(an_element);});
    }
});
register_atom("List", class_List);

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



var class_Bean =
{
    __class__: ['Bean'],

    get_spec:
    function()
    {
        return Register.specs[this.__name__];
    },

    in_spec:
    function(simple_data)
    {
        return true;
        // FIXME TODO SEND NUDES
        // return set(simple_data.keys()).issubset(cls.get_spec().keys());
    },

    is_instance_of:
    function(cls, an_object)
    {
        spec = this.get_spec();

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
    },

    to_simple_data:
    function(an_object)
    {
        spec = this.get_spec();
        simple_data = {};
        for(k in spec)
        {
            simple_data[k] = spec[k].to_simple_data(this.k);
        }
    },

    cast_spec_dict:
    function(simple_data)
    {
        spec = this.get_spec();
        for(k in spec)
        {
            this[k] = this.cast_spec_field(k, spec[k], simple_data);
        }
    },

    cast_spec_field:
    function(field, field_spec, simple_data)
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
                return this.get_default(field);
            }
            else
            {
                throw "TypeError()";
            }
        }
    },

    get_default:
    function(field)
    {
        throw "NotImplementedError()";
    },

    __init__:
    function(that, simple_data)
    {
        if (that.in_spec(simple_data))
        {
            that.cast_spec_dict(simple_data);
        }
        else
        {
            throw "TypeError()";
        }
    },

    get_id:
    function()
    {
        return this[this.__name__ + '_id'];
    }
};