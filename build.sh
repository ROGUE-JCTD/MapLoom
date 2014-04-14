echo ========== Cleaning Bower ==========
echo ====================================
echo  
rm -rf vendor
bower cache clean
rc=$?
if [[ $rc != 0 ]] ; then
    echo Failed to clean the bower cache
    exit $rc
fi

echo   
echo ========== Installing Bower Dependencies ==========
echo ===================================================
echo   
bower install
rc=$?
if [[ $rc != 0 ]] ; then
    echo Failed to install bower dependencies
    exit $rc
fi

echo   
echo ========== Running grunt ==========
echo ===================================
echo   
grunt $*
rc=$?
if [[ $rc != 0 ]] ; then
    exit $rc
fi
