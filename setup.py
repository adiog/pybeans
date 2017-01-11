# encoding: utf-8

from setuptools import setup, find_packages, Command
import sys, os, re, ast


# parse version from pybeans/__init__.py
_version_re = re.compile(r'__version__\s+=\s+(.*)')
_init_file = os.path.join(os.path.abspath(os.path.dirname(__file__)), "__init__.py")
with open(_init_file, 'rb') as f:
    version = str(ast.literal_eval(_version_re.search(
        f.read().decode('utf-8')).group(1)))

setup(
    name='pybeans',
    version=version,
    description="Simple data serialization framework",
    long_description="""PyBeans is a python utility for ease exchange of objects with json specification (Beans) as simple data""",
    classifiers=[
        "Topic :: Software Development :: Utility :: Serialization",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.4",
        "Intended Audience :: Developers",
    ],
    keywords='',
    author='Aleksander Gajewski',
    author_email='adiog@brainfuck.pl',
    url='http://github.com/adiog/pybeans',
    license='MIT',
    packages=find_packages(exclude=['ez_setup', 'examples', 'tests']),
    include_package_data=True,
    zip_safe=False,
    install_requires=[],
    entry_points={},
)
