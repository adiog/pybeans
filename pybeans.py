# -*- coding: utf-8 -*-

"""
This file is a part of pybeans project.
Copyright (c) 2017 Aleksander Gajewski <adiog@brainfuck.pl>.
"""

import json
import os
import re
import datetime


class Atom(object):
    variant = None  # an instance of Typoid or a Bean class

    def __init__(self, variant):
        self.variant = variant

    def __call__(self, *args, **kwargs):
        return self.variant(*args, **kwargs)

    def is_instance_of(self, an_object):
        return self.variant.is_instance_of(an_object)

    def to_simple_data(self, an_object):
        return self.variant.to_simple_data(an_object)

    def is_optional(self):
        return isinstance(self.variant, Optional)

    def is_default(self):
        return isinstance(self.variant, Default)

    def get_default(self):
        return self.variant.get_default()


class Atomic(object):
    @classmethod
    def as_atom(cls, *args):
        return NotImplementedError()


class RegisterError(Exception):
    pass


class BeanRegister(object):
    atoms = {}
    specs = {}
    defaults = {}

    basepath = os.environ.get('PYBEANS_BASEPATH', '.')

    @staticmethod
    def split_to_list(label, type_list):
        if label in BeanRegister.atoms:
            type_list.append(BeanRegister.atoms[label])
            return type_list
        else:
            try:
                a_type = re.search(r'(\w+).*', label).group(1)
            except:
                raise RegisterError('Unknown atom in "%s" of expected form "atom(...)"' % label)
            try:
                remaining_label = re.search(r'\((.*)\)', label).group(1)
            except:
                raise RegisterError('Unknown atom in "%s" of expected form "...(atom)"' % label)
            type_list.append(BeanRegister.atoms[a_type])
            return BeanRegister.split_to_list(remaining_label, type_list)

    @staticmethod
    def fold_invoke(type_list):
        if len(type_list) == 1:
            atomic = type_list[0]
            return atomic.as_atom()
        else:
            return type_list[0].as_atom(BeanRegister.fold_invoke(type_list[1:]))

    @staticmethod
    def get(label):
        split_label = BeanRegister.split_to_list(label, [])
        return BeanRegister.fold_invoke(split_label)

    @staticmethod
    def split_defaults(simple_data):
        if '__defaults__' in simple_data:
            simple_data_defaults = simple_data.pop('__defaults__')
        else:
            simple_data_defaults = {}
        return simple_data, simple_data_defaults

    @staticmethod
    def register_bean(bean_name, bean_atom, bean_spec_with_defaults):
        BeanRegister.atoms[bean_name] = bean_atom
        bean_spec, bean_defaults = BeanRegister.split_defaults(bean_spec_with_defaults)
        BeanRegister.specs[bean_name] = BeanRegister.get_bean_spec(bean_spec)
        BeanRegister.defaults[bean_name] = bean_defaults

    @classmethod
    def get_bean_spec(cls, simple_data_spec):
        return {k: BeanRegister.get(v) for k, v in simple_data_spec.items()}


def register_atom():
    def do_register_atom(atom_object):
        BeanRegister.atoms[atom_object.__name__] = atom_object
        return atom_object

    return do_register_atom


def load_simple_data_from_text(text):
    return json.loads(text)


def load_simple_data_from_file(filename):
    return json.load(open(filename, 'r'))


def register_bean_json(beanfile=None, basepath=BeanRegister.basepath):
    class RegisterBean(object):
        def __init__(self, beanfile, basepath):
            self.beanfile = beanfile
            self.basepath = basepath

        def get_bean_spec_filename(self, bean_object):
            if self.beanfile is None:
                return '%s/%s.json' % (self.basepath, bean_object.__name__)
            else:
                return '%s/%s' % (self.basepath, self.beanfile)

        def __call__(self, bean_object):
            simple_data_with_defaults = load_simple_data_from_file(self.get_bean_spec_filename(bean_object))
            BeanRegister.register_bean(bean_object.__name__, bean_object, simple_data_with_defaults)
            return bean_object


    return RegisterBean(beanfile, basepath)


def register_bean_spec(bean_text):
    class RegisterBean(object):
        def __init__(self, bean_text):
            self.simple_data__with_defaults = load_simple_data_from_text(bean_text)

        def __call__(self, bean_object):
            BeanRegister.register_bean(bean_object.__name__, bean_object, self.simple_data__with_defaults)
            return bean_object

    return RegisterBean(bean_text)


class Typoid(Atomic):
    @classmethod
    def as_atom(cls, *args):
        return Atom(cls(*args))

    def __call__(self, simple_data):
        raise NotImplementedError()

    def is_instance_of(self, an_object):
        raise NotImplementedError()

    def to_simple_data(self, an_object):
        raise NotImplementedError()

    def get_default(self):
        raise NotImplementedError(self.__class__.__name__)


class BaseType(Typoid):
    def is_instance_of(self, an_object):
        raise NotImplementedError()

    def __call__(self, an_object):
        if self.is_instance_of(an_object):
            return an_object
        else:
            raise TypeError()

    def to_simple_data(self, an_object):
        if self.is_instance_of(an_object):
            return an_object
        else:
            raise TypeError()


@register_atom()
class Int(BaseType):
    def is_instance_of(self, an_object):
        return isinstance(an_object, int)

    def get_default(self):
        return 0


@register_atom()
class Float(BaseType):
    def is_instance_of(self, an_object):
        return isinstance(an_object, float)

    def get_default(self):
        return 0.0


@register_atom()
class String(BaseType):
    def is_instance_of(self, an_object):
        return isinstance(an_object, str)

    def get_default(self):
        return ''


@register_atom()
class Optional(Typoid):
    element_type = None

    def __init__(self, element_type):
        self.element_type = element_type

    def __call__(self, an_optional):
        if an_optional is None:
            return None
        else:
            return self.element_type(an_optional)

    def is_instance_of(self, an_object):
        return an_object is None or isinstanceof(an_object, self.element_type)

    def to_simple_data(self, an_object):
        if an_object is None:
            return None
        else:
            return self.element_type.to_simple_data(an_object)

    def get_default(self):
        return None


@register_atom()
class Forward(Typoid):
    element_type = None

    def __init__(self, element_type):
        self.element_type = element_type

    def __call__(self, an_optional):
        return self.element_type(an_optional)

    def is_instance_of(self, an_object):
        return isinstanceof(an_object, self.element_type)

    def to_simple_data(self, an_object):
        return self.element_type.to_simple_data(an_object)

    def get_default(self):
        return self.element_type.get_default()


@register_atom()
class Default(Forward):
    pass


@register_atom()
class List(Typoid):
    element_type = None

    def __init__(self, element_type):
        self.element_type = element_type

    def __call__(self, a_list):
        return [self.element_type(an_element) for an_element in a_list]

    def is_instance_of(self, an_object):
        return all([isinstanceof(an_element, self.element_type) for an_element in an_object])

    def to_simple_data(self, a_list):
        return [self.element_type.to_simple_data(an_element) for an_element in a_list]

    def get_default(self):
        return []


@register_atom()
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

    def get_default(self):
        return datetime.datetime.now()


def isinstanceof(an_object, a_typoid):
    if isinstance(a_typoid, Typoid):
        return a_typoid.is_instance_of(an_object)
    else:
        return isinstance(an_object, a_typoid)


class Bean(Atomic):
    @classmethod
    def as_atom(cls):
        return Atom(cls)

    @classmethod
    def get_spec(cls):
        return BeanRegister.specs[cls.__name__]

    @classmethod
    def get_defaults(cls):
        return BeanRegister.defaults[cls.__name__]

    @classmethod
    def in_spec(cls, simple_data):
        return set(simple_data.keys()).issubset(cls.get_spec().keys())

    @classmethod
    def is_instance_of(cls, an_object):
        return \
            cls.in_spec(an_object.__dict__) \
            and \
            all([v.is_instance_of(an_object.__dict__[k]) for k, v in cls.get_spec().items()])

    @classmethod
    def to_simple_data(cls, an_object):
        return {k: v.to_simple_data(an_object.__dict__[k]) for k,v in cls.get_spec().items()}

    @classmethod
    def cast_spec_dict(cls, simple_data):
        return {field: cls.cast_spec_field(field, field_spec, simple_data) for field, field_spec in cls.get_spec().items()}

    @classmethod
    def cast_spec_field(cls, field, field_spec, simple_data):
        return cls.do_cast_spec_field(field, field_spec, simple_data)

    @classmethod
    def do_cast_spec_field(cls, field, field_spec, simple_data):
        if field in simple_data:
            return field_spec(simple_data[field])
        else:
            if field_spec.is_optional():
                return None
            elif field_spec.is_default():
                return cls.get_field_default(field, field_spec)
            else:
                raise TypeError()

    @classmethod
    def get_field_default(cls, field, field_spec):
        try:
            return cls.get_runtime_default(field, field_spec)
        except NotImplementedError:
            return cls.get_static_default(field, field_spec)

    @classmethod
    def get_runtime_default(cls, field, field_spec):
        raise NotImplementedError()

    @classmethod
    def get_static_default(cls, field, field_spec):
        if field in cls.get_defaults():
            return field_spec(cls.get_defaults()[field])
        else:
            return field_spec.get_default()

    @classmethod
    def get_default(cls):
        return cls({})

    def __init__(self, simple_data=None, **kwargs):
        if simple_data is None:
            simple_data = {k: self.__class__.get_spec()[k].to_simple_data(v) for k,v in kwargs.items()}  # TODO: this is a dirty trick - short and not optimized
        if self.__class__.in_spec(simple_data):
            self.__dict__ = self.__class__.cast_spec_dict(simple_data)
        else:
            raise TypeError()

    def get_id(self):
        return self.__dict__['%s_id' % self.__class__.__name__]


class MinimalBean(Bean):
    @classmethod
    def cast_spec_field(cls, field, field_spec, simple_data):
        if not field_spec.is_default() or field in simple_data:
            return cls.do_cast_spec_field(field, field_spec, simple_data)
