import itertools
import time

def find(self_describing_num):
    for i in range(1,10000000000):
        s = str(i)
        count = [0]*10
        for c in s:
            count[int(c)] += 1
        if count == [int(x) for x in s]:
            return i
    return 0

print(find(0))