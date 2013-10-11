#!/usr/bin/python
# EASY-INSTALL-ENTRY-SCRIPT: 'closure-linter==2.3.11','console_scripts','gjslint'
__requires__ = 'closure-linter==2.3.11'
import sys
from pkg_resources import load_entry_point

sys.exit(
   load_entry_point('closure-linter==2.3.11', 'console_scripts', 'gjslint')()
)
