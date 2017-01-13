# -*- coding: utf-8 -*-

"""
This file is a part of pybeans project.
Copyright (c) 2017 Aleksander Gajewski <adiog@brainfuck.pl>,
"""

import datetime
from unittest import TestCase

from pybeans import Int, String, Float, List, BeanRegister, register_atom, DateTime, \
    register_bean_spec, Bean, register_bean_json, MinimalBean


class BeansTestCase(TestCase):
    # the concept of typoid assume that there is an object of class derived
    # from Typoid, that provides predicate:
    #   is_instance_of
    # and
    #   'decode' - from_simple_data - that acts as consructor __call__
    #   'encode' - to_simple_data

    def test_int(self):
        an_int_typoid = Int()

        an_int = an_int_typoid(15)

        self.assertEqual(an_int, 15)

        with self.assertRaises(TypeError):
            an_int_typoid("15")

        self.assertEqual(an_int_typoid.to_simple_data(an_int), 15)

    def test_str(self):
        a_string_typoid = String()

        fifteen = a_string_typoid('15')

        self.assertEqual(fifteen, '15')

        with self.assertRaises(TypeError):
            a_string_typoid(15)

        self.assertEqual(a_string_typoid.to_simple_data(fifteen), '15')

    def test_float(self):
        a_float_typoid = Float()

        a_float = a_float_typoid(3.14)

        self.assertEqual(a_float, 3.14)

        with self.assertRaises(TypeError):
            a_float_typoid("3.14")

        self.assertEqual(a_float_typoid.to_simple_data(a_float), 3.14)

    def test_list(self):
        a_list_of_int = BeanRegister.get('List(Int)')

        self.assertEqual(a_list_of_int([1,2,3]), [1,2,3])

        with self.assertRaises(TypeError):
            a_list_of_int([1,2,3.14])

        self.assertEqual(a_list_of_int.to_simple_data([1,2,3]), [1,2,3])

    def test_int_validated(self):
        @register_atom()
        class EvenIntOrSeven(Int):
            def is_instance_of(self, an_object):
                return super().is_instance_of(an_object) and (an_object % 2 == 0 or an_object == 7)

        a_validated_int = EvenIntOrSeven()

        self.assertEqual(a_validated_int(4), 4)
        self.assertEqual(a_validated_int(7), 7)

        with self.assertRaises(TypeError):
            a_validated_int(9)

        self.assertEqual(a_validated_int.to_simple_data(16), 16)
        self.assertEqual(a_validated_int.to_simple_data(7), 7)
        with self.assertRaises(TypeError):
            self.assertEqual(a_validated_int.to_simple_data(15), 15)

    def test_list_int_validated(self):
        @register_atom()
        class EvenIntOrSeven(Int):
            def is_instance_of(self, an_object):
                return super().is_instance_of(an_object) and (an_object % 2 == 0 or an_object == 7)

        a_validated_list = List(EvenIntOrSeven())

        self.assertEqual(a_validated_list([4,8,7,7]), [4,8,7,7])
        self.assertEqual(a_validated_list([]), [])

        with self.assertRaises(TypeError):
            a_validated_list([2,4,5])

        self.assertEqual(a_validated_list.to_simple_data([16]), [16])
        self.assertEqual(a_validated_list.to_simple_data([7]), [7])
        with self.assertRaises(TypeError):
            self.assertEqual(a_validated_list.to_simple_data([15]), [15])

    def test_datetime(self):
        now_as_simple_data = [2017, 1, 8, 0, 18, 3, 551201]

        a_datetime = DateTime()

        now = a_datetime(now_as_simple_data)
        self.assertIsInstance(now, datetime.datetime)
        self.assertEqual(a_datetime.to_simple_data(now), now_as_simple_data)

    def test_bean(self):
        @register_bean_spec('''
        {
            "an_int": "Int",
            "list_of_int": "List(Int)"
        }
        ''')
        class TestBean(Bean):
           pass

        a_test_bean = TestBean({'an_int': 123, 'list_of_int': [1,2,3]})

        self.assertEqual(a_test_bean.an_int, 123)
        self.assertEqual(a_test_bean.list_of_int, [1,2,3])

        with self.assertRaises(TypeError):
            TestBean({'list_of_int': [1,2,3]})

    def test_bean_optional(self):
        @register_bean_spec('''
        {
            "an_int": "Optional(Int)",
            "list_of_int": "List(Int)"
        }
        ''')
        class TestBean(Bean):
            pass

        a_test_bean = TestBean({'list_of_int': [1,2,3]})

        self.assertEqual(a_test_bean.an_int, None)
        self.assertEqual(a_test_bean.list_of_int, [1,2,3])

    def test_bean_default_runtime(self):
        @register_bean_spec('''
        {
            "an_int": "Default(Int)",
            "list_of_int": "List(Int)"
        }
        ''')
        class TestBean(Bean):
            @classmethod
            def get_runtime_default(cls, field, field_spec):
                if field == 'an_int':
                    return 541

        a_test_bean = TestBean({'list_of_int': [1,2,3]})

        self.assertEqual(a_test_bean.an_int, 541)
        self.assertEqual(a_test_bean.list_of_int, [1,2,3])

    def test_bean_default_static(self):
        @register_bean_spec('''
        {
            "an_int": "Default(Int)",
            "list_of_int": "List(Int)",
            "__defaults__": {"an_int": 128}
        }
        ''')
        class TestBean(Bean):
            pass

        a_test_bean = TestBean({'list_of_int': [1,2,3]})

        self.assertEqual(a_test_bean.an_int, 128)
        self.assertEqual(a_test_bean.list_of_int, [1,2,3])

    def test_bean_default_empty(self):
        @register_bean_spec('''
        {
            "an_int": "Default(Int)",
            "list_of_int": "List(Int)"
        }
        ''')
        class TestBean(Bean):
            pass

        a_test_bean = TestBean({'list_of_int': [1,2,3]})

        self.assertEqual(a_test_bean.an_int, 0)
        self.assertEqual(a_test_bean.list_of_int, [1,2,3])


    def test_bean_with_bean(self):
        @register_bean_spec('''
        {
            "a_str": "Optional(String)",
            "an_int": "Default(Int)",
            "list_of_int": "Default(List(Int))"
        }

        ''')
        class WrappedBean(Bean):
            @classmethod
            def get_runtime_default(cls, field, field_spec):
                if field == "an_int":
                    return 541
                if field == "list_of_int":
                    return [1,3,7]
                else:
                    raise TypeError()

        @register_bean_spec('''
        {
            "wraps": "List(WrappedBean)"
        }
        ''')
        class WrappingBean(Bean):
            pass

        a_bean = WrappingBean(wraps=[WrappedBean()])
        self.assertEqual(a_bean.wraps[0].a_str, None)
        self.assertEqual(a_bean.wraps[0].an_int, 541)
        self.assertEqual(a_bean.wraps[0].list_of_int, [1,3,7])

        self.assertEqual(WrappingBean.to_simple_data(a_bean), {'wraps': [{'an_int': 541, 'list_of_int': [1, 3, 7], 'a_str': None}]} )

    def test_bean_json(self):
        @register_bean_json('beanspec.json', basepath='tests')
        class SampleBean(Bean):
            @classmethod
            def get_runtime_default(cls, field, field_spec):
                if field == "an_int":
                    return 541
                if field == "list_of_int":
                    return [1,3,7]
                else:
                    raise TypeError()

        a_bean = SampleBean()
        self.assertEqual(a_bean.a_str, None)
        self.assertEqual(a_bean.an_int, 541)
        self.assertEqual(a_bean.list_of_int, [1,3,7])


    def test_minimal_bean_json(self):
        @register_bean_json('beanspec.json', basepath='tests')
        class SampleBean(MinimalBean):
            pass

        a_bean = SampleBean()
        self.assertEqual(a_bean.a_str, None)
